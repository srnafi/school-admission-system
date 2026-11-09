using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<ClassEntity> Classes => Set<ClassEntity>();

    public DbSet<Hold> Holds => Set<Hold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ClassEntity>(entity =>
        {
            entity.ToTable("classes", table =>
                table.HasCheckConstraint("ck_classes_total_seats", "total_seats > 0"));

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.TotalSeats).HasColumnName("total_seats");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Hold>(entity =>
        {
            entity.ToTable("holds", table => table.HasCheckConstraint(
                "ck_holds_status",
                "status in ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')"));

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id").HasMaxLength(17).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>().HasColumnType("text");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.ConfirmedAt).HasColumnName("confirmed_at");

            entity.HasOne<ClassEntity>()
                .WithMany()
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            // one live or confirmed application per student per class
            entity.HasIndex(e => new { e.ClassId, e.StudentId })
                .HasDatabaseName("uq_active_hold")
                .IsUnique()
                .HasFilter("status in ('HELD', 'CONFIRMED')");

            entity.HasIndex(e => new { e.ClassId, e.Status, e.ExpiresAt })
                .HasDatabaseName("ix_holds_class_status");

            entity.HasIndex(e => e.StudentId).HasDatabaseName("ix_holds_student");
        });
    }
}
