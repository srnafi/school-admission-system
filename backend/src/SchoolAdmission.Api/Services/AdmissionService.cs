using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using SchoolAdmission.Api.Contracts;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Errors;

namespace SchoolAdmission.Api.Services;

public class AdmissionService
{
    private const int MaxClassNameLength = 200;

    private const string SeatCountsSql = """
        select c.id as "Id",
               c.name as "Name",
               c.total_seats as "TotalSeats",
               coalesce(h.held, 0) as "HeldSeats",
               coalesce(h.confirmed, 0) as "ConfirmedSeats",
               c.total_seats - coalesce(h.held, 0) - coalesce(h.confirmed, 0) as "AvailableSeats"
        from classes c
        left join (
            select class_id,
                   count(*) filter (where status = 'HELD' and expires_at > now()) as held,
                   count(*) filter (where status = 'CONFIRMED') as confirmed
            from holds
            group by class_id
        ) h on h.class_id = c.id
        """;

    private const string SeatUsageSql = """
        select count(*) filter (where status = 'CONFIRMED') as "ConfirmedSeats",
               count(*) filter (where status = 'HELD' and expires_at > {1}) as "HeldSeats"
        from holds
        where class_id = {0}
        """;

    private const string ActiveHoldSql = """
        select count(*)::int as "Value"
        from holds
        where class_id = {0} and student_id = {1} and status in ('HELD', 'CONFIRMED')
        """;

    private const string HoldStateSql = """
        select id as "HoldId", class_id as "ClassId", student_id as "StudentId",
               case when status = 'HELD' and expires_at <= now() then 'EXPIRED' else status end as "Status",
               expires_at as "ExpiresAt"
        from holds
        where id = {0}
        """;

    private const string StudentHoldsSql = """
        select h.id as "HoldId", h.class_id as "ClassId", c.name as "ClassName",
               case when h.status = 'HELD' and h.expires_at <= now() then 'EXPIRED' else h.status end as "Status",
               h.expires_at as "ExpiresAt"
        from holds h
        join classes c on c.id = h.class_id
        where h.student_id = {0}
        order by h.created_at desc, h.id
        """;

    private readonly AppDbContext _db;
    private readonly HoldSettings _holdSettings;

    public AdmissionService(AppDbContext db, HoldSettings holdSettings)
    {
        _db = db;
        _holdSettings = holdSettings;
    }

    public async Task<ClassResponse> CreateClassAsync(CreateClassRequest? request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            throw ApiException.InvalidInput("A request body is required.");
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            throw ApiException.InvalidInput("Class name is required.");
        }

        if (name.Length > MaxClassNameLength)
        {
            throw ApiException.InvalidInput($"Class name must be at most {MaxClassNameLength} characters.");
        }

        if (request.TotalSeats is null or <= 0)
        {
            throw ApiException.InvalidInput("Total seats must be a whole number greater than zero.");
        }

        var now = await _db.NowAsync(cancellationToken);

        var entity = new ClassEntity
        {
            Id = Ids.NewClassId(),
            Name = name,
            TotalSeats = request.TotalSeats.Value,
            CreatedAt = now
        };

        _db.Classes.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return new ClassResponse(entity.Id, entity.Name, entity.TotalSeats, 0, 0, entity.TotalSeats);
    }

    public async Task<IReadOnlyList<ClassResponse>> ListClassesAsync(CancellationToken cancellationToken = default)
    {
        var sql = SeatCountsSql + " order by c.name, c.id";

        var rows = await _db.Database
            .SqlQueryRaw<ClassSeatsRow>(sql)
            .ToListAsync(cancellationToken);

        return rows.Select(ToResponse).ToList();
    }

    public async Task<ClassResponse> GetClassAsync(string classId, CancellationToken cancellationToken = default)
    {
        var sql = SeatCountsSql + " where c.id = {0}";

        var rows = await _db.Database
            .SqlQueryRaw<ClassSeatsRow>(sql, classId)
            .ToListAsync(cancellationToken);

        var row = rows.FirstOrDefault();

        return row is null ? throw ApiException.ClassNotFound(classId) : ToResponse(row);
    }

    public async Task<HoldResponse> CreateHoldAsync(
        string classId,
        string studentId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        // the class row lock serialises every application for this class
        var totalSeats = await LockClassRowAsync(classId, cancellationToken);
        if (totalSeats < 0)
        {
            throw ApiException.ClassNotFound(classId);
        }

        var now = await _db.NowAsync(cancellationToken);

        await _db.Database.ExecuteSqlRawAsync(
            "update holds set status = 'EXPIRED' where class_id = {0} and status = 'HELD' and expires_at <= {1}",
            new object[] { classId, now },
            cancellationToken);

        var activeHolds = await _db.Database
            .SqlQueryRaw<int>(ActiveHoldSql, classId, studentId)
            .SingleAsync(cancellationToken);

        if (activeHolds > 0)
        {
            throw ApiException.AlreadyApplied();
        }

        var usage = await _db.Database
            .SqlQueryRaw<SeatUsageRow>(SeatUsageSql, classId, now)
            .SingleAsync(cancellationToken);

        if (usage.HeldSeats + usage.ConfirmedSeats >= totalSeats)
        {
            throw ApiException.NoSeats();
        }

        var hold = new Hold
        {
            Id = Ids.NewHoldId(),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.HELD,
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(_holdSettings.DurationSeconds)
        };

        _db.Holds.Add(hold);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw ApiException.AlreadyApplied();
        }

        await transaction.CommitAsync(cancellationToken);

        return new HoldResponse(hold.Id, hold.ClassId, hold.StudentId, hold.Status.ToString(), hold.ExpiresAt);
    }

    public async Task<HoldResponse> GetHoldAsync(string holdId, CancellationToken cancellationToken = default)
    {
        var rows = await _db.Database
            .SqlQueryRaw<HoldStateRow>(HoldStateSql, holdId)
            .ToListAsync(cancellationToken);

        var row = rows.FirstOrDefault();

        return row is null
            ? throw ApiException.HoldNotFound(holdId)
            : new HoldResponse(row.HoldId, row.ClassId, row.StudentId, row.Status, row.ExpiresAt);
    }

    public async Task<IReadOnlyList<HoldSummaryResponse>> ListStudentHoldsAsync(
        string studentId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _db.Database
            .SqlQueryRaw<HoldSummaryRow>(StudentHoldsSql, studentId)
            .ToListAsync(cancellationToken);

        return rows
            .Select(row => new HoldSummaryResponse(row.HoldId, row.ClassId, row.ClassName, row.Status, row.ExpiresAt))
            .ToList();
    }

    public async Task<ConfirmHoldResponse> ConfirmHoldAsync(
        string holdId,
        string studentId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var hold = await LockHoldRowAsync(holdId, cancellationToken)
            ?? throw ApiException.HoldNotFound(holdId);

        if (hold.StudentId != studentId)
        {
            throw ApiException.Forbidden();
        }

        if (hold.Status == nameof(HoldStatus.CONFIRMED))
        {
            await transaction.CommitAsync(cancellationToken);
            return new ConfirmHoldResponse(holdId, nameof(HoldStatus.CONFIRMED));
        }

        if (hold.Status == nameof(HoldStatus.CANCELLED))
        {
            throw ApiException.HoldNotActive();
        }

        if (hold.Status == nameof(HoldStatus.EXPIRED))
        {
            throw ApiException.HoldExpired();
        }

        var now = await _db.NowAsync(cancellationToken);

        if (hold.ExpiresAt <= now)
        {
            await _db.Database.ExecuteSqlRawAsync(
                "update holds set status = 'EXPIRED' where id = {0} and status = 'HELD'",
                new object[] { holdId },
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            throw ApiException.HoldExpired();
        }

        await _db.Database.ExecuteSqlRawAsync(
            "update holds set status = 'CONFIRMED', confirmed_at = {1} where id = {0} and status = 'HELD'",
            new object[] { holdId, now },
            cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return new ConfirmHoldResponse(holdId, nameof(HoldStatus.CONFIRMED));
    }

    public async Task CancelHoldAsync(string holdId, string studentId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var hold = await LockHoldRowAsync(holdId, cancellationToken)
            ?? throw ApiException.HoldNotFound(holdId);

        if (hold.StudentId != studentId)
        {
            throw ApiException.Forbidden();
        }

        if (hold.Status == nameof(HoldStatus.CONFIRMED))
        {
            throw ApiException.HoldNotActive();
        }

        if (hold.Status == nameof(HoldStatus.HELD))
        {
            var now = await _db.NowAsync(cancellationToken);
            var nextStatus = hold.ExpiresAt <= now ? nameof(HoldStatus.EXPIRED) : nameof(HoldStatus.CANCELLED);

            await _db.Database.ExecuteSqlRawAsync(
                "update holds set status = {1} where id = {0} and status = 'HELD'",
                new object[] { holdId, nextStatus },
                cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private async Task<int> LockClassRowAsync(string classId, CancellationToken cancellationToken)
    {
        var connection = _db.Database.GetDbConnection();

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = "select total_seats from classes where id = @class_id for update";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "class_id";
        parameter.Value = classId;
        command.Parameters.Add(parameter);

        var transaction = _db.Database.CurrentTransaction;
        if (transaction is not null)
        {
            command.Transaction = transaction.GetDbTransaction();
        }

        var result = await command.ExecuteScalarAsync(cancellationToken);

        return result is null ? -1 : (int)result;
    }

    private async Task<LockedHold?> LockHoldRowAsync(string holdId, CancellationToken cancellationToken)
    {
        var connection = _db.Database.GetDbConnection();

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var command = connection.CreateCommand();
        command.CommandText =
            "select student_id, status, expires_at from holds where id = @hold_id for update";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "hold_id";
        parameter.Value = holdId;
        command.Parameters.Add(parameter);

        var transaction = _db.Database.CurrentTransaction;
        if (transaction is not null)
        {
            command.Transaction = transaction.GetDbTransaction();
        }

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var studentId = reader.GetString(0);
        var status = reader.GetString(1);
        var expiresAt = new DateTimeOffset(reader.GetDateTime(2), TimeSpan.Zero);

        return new LockedHold(studentId, status, expiresAt);
    }

    private static ClassResponse ToResponse(ClassSeatsRow row) => new(
        row.Id,
        row.Name,
        row.TotalSeats,
        row.HeldSeats,
        row.ConfirmedSeats,
        row.AvailableSeats);

    private sealed record LockedHold(string StudentId, string Status, DateTimeOffset ExpiresAt);
}
