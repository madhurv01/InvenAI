using InventoryApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryApi.Data;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Inventory> Inventory => Set<Inventory>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<AppUser> Users => Set<AppUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Supplier>(e =>
        {
            e.ToTable("suppliers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.ContactPerson).HasColumnName("contact_person");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.LeadTimeDays).HasColumnName("lead_time_days");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Warehouse>(e =>
        {
            e.ToTable("warehouses");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Location).HasColumnName("location");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Sku).HasColumnName("sku");
            e.Property(x => x.CategoryId).HasColumnName("category_id");
            e.Property(x => x.SupplierId).HasColumnName("supplier_id");
            e.Property(x => x.UnitPrice).HasColumnName("unit_price").HasColumnType("numeric(12,2)");
            e.Property(x => x.MinimumStockLevel).HasColumnName("minimum_stock_level");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Sku).IsUnique();

            e.HasOne(x => x.Category).WithMany(c => c.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Supplier).WithMany(s => s.Products).HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Inventory>(e =>
        {
            e.ToTable("inventory");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.WarehouseId).HasColumnName("warehouse_id");
            e.Property(x => x.QuantityOnHand).HasColumnName("quantity_on_hand");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => new { x.ProductId, x.WarehouseId }).IsUnique();

            e.HasOne(x => x.Product).WithMany(p => p.InventoryRecords).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StockMovement>(e =>
        {
            e.ToTable("stock_movements");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.WarehouseId).HasColumnName("warehouse_id");
            e.Property(x => x.MovementType).HasColumnName("movement_type");
            e.Property(x => x.Quantity).HasColumnName("quantity");
            e.Property(x => x.Reason).HasColumnName("reason");
            e.Property(x => x.ReferenceNo).HasColumnName("reference_no");
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppUser>(e =>
        {
            e.ToTable("app_users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.FullName).HasColumnName("full_name");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.PasswordHash).HasColumnName("password_hash");
            e.Property(x => x.Role).HasColumnName("role");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.Email).IsUnique();
        });
    }
}
