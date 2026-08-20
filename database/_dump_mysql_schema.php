<?php

/**
 * Dump MySQL final schema for Wave 5 C7 using PDO (no mysqldump required).
 * Loads credentials from .env. Run: php database/_dump_mysql_schema.php
 */

function env_val(string $key, ?string $default = null): ?string
{
    static $env = null;
    if ($env === null) {
        $env = [];
        foreach (file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if (str_starts_with(trim($line), '#') || ! str_contains($line, '=')) {
                continue;
            }
            [$k, $v] = explode('=', $line, 2);
            $env[trim($k)] = trim($v, " \t\"'");
        }
    }

    return $env[$key] ?? $default;
}

$host = env_val('DB_HOST', '127.0.0.1');
$port = env_val('DB_PORT', '3306');
$database = env_val('DB_DATABASE');
$username = env_val('DB_USERNAME');
$password = env_val('DB_PASSWORD', '');

if (! $database || ! $username) {
    fwrite(STDERR, "Missing DB credentials in .env\n");
    exit(1);
}

$dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
$pdo = new PDO($dsn, $username, $password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$tables = $pdo->query('SHOW FULL TABLES WHERE Table_type = \'BASE TABLE\'')->fetchAll(PDO::FETCH_NUM);
$tableNames = array_map(fn ($r) => $r[0], $tables);

$out = "-- Balancer Wave 5 C7 squash — MySQL final schema (generated)\n";
$out .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

foreach ($tableNames as $table) {
    $row = $pdo->query('SHOW CREATE TABLE `' . str_replace('`', '``', $table) . '`')->fetch(PDO::FETCH_ASSOC);
    $create = $row['Create Table'] ?? $row['Create Table'] ?? null;
    // SHOW CREATE TABLE returns keys "Table" and "Create Table"
    $create = array_values($row)[1] ?? null;
    if (! $create) {
        fwrite(STDERR, "Failed to get CREATE for {$table}\n");
        exit(1);
    }
    $out .= "DROP TABLE IF EXISTS `{$table}`;\n";
    $out .= $create . ";\n\n";
}

// Migration stubs from live DB (so pruned PHP files aren't re-run on fresh MySQL either)
$migrations = $pdo->query('SELECT id, migration, batch FROM migrations ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
foreach ($migrations as $row) {
    $id = (int) $row['id'];
    $migration = addslashes($row['migration']);
    $batch = (int) $row['batch'];
    $out .= "INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ({$id}, '{$migration}', {$batch});\n";
}

$out .= "\nSET FOREIGN_KEY_CHECKS=1;\n";

$dir = __DIR__ . '/schema';
if (! is_dir($dir)) {
    mkdir($dir, 0777, true);
}

// Laravel looks for {connection}-schema.sql — default connection name is usually "mysql"
$path = $dir . '/mysql-schema.sql';
file_put_contents($path, $out);

echo "Wrote {$path} (" . strlen($out) . " bytes)\n";
echo 'Tables: ' . implode(', ', $tableNames) . "\n";
echo 'Migration stubs: ' . count($migrations) . "\n";
