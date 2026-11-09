using Microsoft.EntityFrameworkCore;
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

    private readonly AppDbContext _db;

    public AdmissionService(AppDbContext db)
    {
        _db = db;
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

    private static ClassResponse ToResponse(ClassSeatsRow row) => new(
        row.Id,
        row.Name,
        row.TotalSeats,
        row.HeldSeats,
        row.ConfirmedSeats,
        row.AvailableSeats);
}
