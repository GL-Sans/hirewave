# Test

I test Unit non usano il database.

I test Feature usano `RefreshDatabase`, che **svuota il database**: girano su un
database MySQL separato, mai su `hirewave`.

```powershell
# una volta sola
mysql -u root -p -e "CREATE DATABASE hirewave_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# ogni volta
$env:DB_CONNECTION='mysql'; $env:DB_DATABASE='hirewave_test'; php artisan test
```
