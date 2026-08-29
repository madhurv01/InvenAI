# Multi-stage build for the ASP.NET Core 8 API — used for deploying to any container host
# (Fly.io, Render, Railway, Azure Container Apps, a VPS, etc.). Not needed for local
# development (`dotnet run` still works as before).

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY InventoryApi.csproj .
RUN dotnet restore InventoryApi.csproj

COPY . .
RUN dotnet publish InventoryApi.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "InventoryApi.dll"]
