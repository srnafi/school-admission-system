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

    private static ClassResponse ToResponse(ClassSeatsRow row) => new(
        row.Id,
        row.Name,
        row.TotalSeats,
        row.HeldSeats,
        row.ConfirmedSeats,
        row.AvailableSeats);
}
