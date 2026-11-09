using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace SchoolAdmission.Api.Data;

public static class DatabaseClock
{
    public static async Task<DateTimeOffset> NowAsync(this AppDbContext db, CancellationToken cancellationToken = default)
    {
        var connection = db.Database.GetDbConnection();

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = "select now()";

        var transaction = db.Database.CurrentTransaction;
        if (transaction is not null)
        {
            command.Transaction = transaction.GetDbTransaction();
        }

        var value = await command.ExecuteScalarAsync(cancellationToken);

        return new DateTimeOffset((DateTime)value!, TimeSpan.Zero);
    }
}
