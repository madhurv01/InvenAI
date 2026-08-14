# AI-Powered Inventory Management System

A focused, modular inventory management web app — not a full ERP.

- **Frontend:** Angular 18 (standalone components), HTML5, CSS3
- **Backend:** C# / ASP.NET Core 8 Web API
- **Database:** Supabase PostgreSQL (only)
- **AI:** Claude API (Anthropic) — with a safe rule-based fallback if no key is configured
- **Auth:** JWT (email + password, BCrypt-hashed)

```
InventoryApp/
├── backend/InventoryApi/       # ASP.NET Core Web API (open in Visual Studio)
├── frontend/inventory-app/     # Angular app (open in VS Code)
└── database/                   # SQL scripts to run in Supabase
```

---

## 1. Set up Supabase (PostgreSQL)

1. Create a free project at https://supabase.com.
2. Go to **Project Settings → Database** and copy your connection string / password. Also note your **Project Reference** (the `xxxx` in `xxxx.supabase.co`).
3. Open the **SQL Editor** in Supabase and run, in order:
   - `database/01_schema.sql` — creates all tables, constraints, indexes, triggers.
   - `database/02_seed.sql` — optional sample data (products, suppliers, stock, and a demo admin login).

The seed script creates a default login:
- **Email:** `admin@inventory.local`
- **Password:** `Admin@123`

> You can skip the seed script and just register a new user from the Angular login screen instead — registration is open (`POST /api/auth/register`).

---

## 2. Configure and run the backend (Visual Studio)

**Requirements:** .NET 8 SDK, Visual Studio 2022 Community (or `dotnet` CLI).

1. Open `backend/InventoryApi/InventoryApi.csproj` in Visual Studio (or `cd backend/InventoryApi`).
2. Edit `appsettings.json`:

```json
"ConnectionStrings": {
  "SupabaseConnection": "Host=YOUR-PROJECT-REF.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR-DB-PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
},
"Jwt": {
  "SecretKey": "REPLACE_WITH_A_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS"
},
"Anthropic": {
  "ApiKey": "REPLACE_WITH_YOUR_ANTHROPIC_API_KEY"
}
```

- **SupabaseConnection**: from Supabase → Project Settings → Database → Connection string (URI or "Session pooler" also works — just map the fields into the Npgsql format above).
- **Jwt:SecretKey**: any long random string (32+ characters). Used to sign login tokens.
- **Anthropic:ApiKey**: your Claude API key from https://console.anthropic.com. If you leave this as the placeholder, the AI Assistant still works — it falls back to a deterministic, rule-based summary generated from the same real Supabase data, so the feature is functional even before you add a key.

3. Restore & run:
   - In Visual Studio: press **F5** (or `Ctrl+F5`).
   - Or via CLI: `dotnet restore && dotnet run`.
4. The API starts on `https://localhost:7080` (check the exact port in the console output / `Properties/launchSettings.json` if you generate one). Swagger UI is available at `/swagger` in development mode.

The app uses EF Core against your Supabase Postgres — no local database is needed. Tables must already exist (from step 1); EF Core does **not** auto-create them, by design, so schema stays fully controlled via SQL scripts.

---

## 3. Configure and run the frontend (VS Code)

**Requirements:** Node.js 18+, Angular CLI (`npm install -g @angular/cli`).

1. Open the `frontend/inventory-app` folder in VS Code.
2. Install dependencies:

```bash
cd frontend/inventory-app
npm install
```

3. Point the app at your backend API — edit `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7080/api'   // match your backend's actual port
};
```

4. Run the dev server:

```bash
npm start
```

5. Open `http://localhost:4200`. Log in with the seeded admin account, or register a new user.

> If the browser blocks the API call due to the backend's self-signed HTTPS dev certificate, run `dotnet dev-certs https --trust` once, or temporarily switch the backend to `http://localhost:5080` and update `environment.ts` to match (also update `Cors:AllowedOrigins` and remove `app.UseHttpsRedirection()` if you do this).

---

## 4. What's included

### Product Management
Create, edit, delete, and view products (name, SKU, category, unit price, minimum stock level, status), with reactive-form validation and duplicate-SKU protection.

### Inventory & Stock Management
- Current stock per product per warehouse.
- Stock-in, stock-out, and manual adjustments — each writes a `stock_movements` row, so you get a full audit trail.
- Movement history view with filters.

### Supplier Management
Full CRUD, with lead time (days), contact info, and product associations. Suppliers linked to active products can't be deleted until reassigned (data integrity).

### Inventory Dashboard
Total products, total inventory value, low-stock count, recent movements, and a category-value breakdown chart — plus search/filter controls throughout the product/inventory/supplier screens.

### AI Inventory Assistant
Embedded in the dashboard. The chain is:

```
User question
   → Intent classification (low_stock / recent_movements / summary)
   → Controlled .NET function (GetLowStockProductsAsync / GetRecentStockMovementsAsync / GetInventorySummaryAsync)
   → Real data from Supabase
   → Claude API generates a concise, business-oriented answer from that data
   → Rendered in the Angular chat panel
```

The AI **never** executes SQL directly — it only ever sees the JSON returned by those three whitelisted backend functions, which keeps the surface area small, predictable, and easy to extend (add a new intent + a new controlled function whenever you need the assistant to answer a new kind of question).

---

## 5. Project structure reference

**Backend** (`Controllers → Services → EF Core/Supabase`):
```
Controllers/     ProductsController, SuppliersController, InventoryController,
                 DashboardController, AiAssistantController, AuthController, CategoriesController
Services/        ProductService, SupplierService, InventoryService, DashboardService,
                 AiAssistantService, AuthService (+ Interfaces/)
DTOs/            Request/response contracts, kept separate from entities
Models/          EF Core entities
Data/             InventoryDbContext (maps entities to snake_case Supabase tables)
Middleware/      ExceptionMiddleware (global error handling -> consistent JSON errors)
```

**Frontend** (`core/ shared/ features/...`):
```
core/            AuthService, JWT interceptor, error interceptor, ApiService, auth guard, layout
shared/          Cross-feature models + reusable components (loading spinner, etc.)
features/
  auth/          Login/register
  products/      List + create/edit form
  inventory/     Stock view, movement history, movement form
  suppliers/     List + create/edit form
  dashboard/     Summary cards, category chart, low-stock table, recent movements
  ai/            AI Assistant chat panel + service
```

---

## 6. Extending the app

- **New AI question types:** add a keyword rule to `ClassifyIntent()` in `AiAssistantService.cs`, add a new controlled function to `IInventoryService`, and map the new intent to it in `AskAsync()`.
- **New entities (e.g. Purchase Orders):** add the table in a new `database/03_*.sql` migration, an EF Core entity + DbSet, a service + controller, and a matching Angular feature folder — the same pattern used throughout.
- **Roles/permissions:** `AppUser.Role` and the JWT `ClaimTypes.Role` claim are already in place; add `[Authorize(Roles = "Admin")]` to any controller/action that needs restricting.

---

## 7. Security notes

- Passwords are hashed with BCrypt; the API never stores or returns plaintext passwords.
- All inventory/product/supplier endpoints require a valid JWT (`[Authorize]`); only `/api/auth/login` and `/api/auth/register` are anonymous.
- CORS is locked to the origins listed in `Cors:AllowedOrigins` (defaults to `http://localhost:4200`).
- Angular never talks to Supabase directly — every request goes through the .NET API, which is also the only place the Supabase connection string and the Anthropic API key ever live.
- Change the seeded admin password (or delete that row) before using this anywhere beyond local development.
