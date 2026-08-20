<?php

/**
 * One-shot helper: dump final SQLite schema for Wave 5 C7 (no sqlite3 CLI required).
 * Run: php database/_dump_sqlite_schema.php
 */

$dbPath = __DIR__ . '/squash-build.sqlite';

if (! file_exists($dbPath)) {
    fwrite(STDERR, "Missing {$dbPath} — run migrations into it first.\n");
    exit(1);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$rows = $pdo->query(
    "SELECT type, name, sql FROM sqlite_master
     WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
     ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name"
)->fetchAll(PDO::FETCH_ASSOC);

$out = "-- Balancer Wave 5 C7 squash — SQLite final schema (generated)\n";
$out .= "-- Loaded by migrate when migrations table is empty (tests / migrate:fresh).\n";
$out .= "PRAGMA foreign_keys = OFF;\n";
$out .= "BEGIN;\n\n";

foreach ($rows as $r) {
    $out .= $r['sql'] . ";\n\n";
}

// Mark historical migrations as applied so pruned PHP files are not expected.
$migrationNames = $pdo->query('SELECT id, migration, batch FROM migrations ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
foreach ($migrationNames as $row) {
    $id = (int) $row['id'];
    $migration = str_replace("'", "''", $row['migration']);
    $batch = (int) $row['batch'];
    $out .= "INSERT INTO migrations (id, migration, batch) VALUES ({$id}, '{$migration}', {$batch});\n";
}

$out .= "\nCOMMIT;\n";
$out .= "PRAGMA foreign_keys = ON;\n";

$dir = __DIR__ . '/schema';
if (! is_dir($dir)) {
    mkdir($dir, 0777, true);
}

$path = $dir . '/sqlite-schema.sql';
file_put_contents($path, $out);

$tables = array_column(array_filter($rows, fn ($r) => $r['type'] === 'table'), 'name');
echo "Wrote {$path} (" . strlen($out) . " bytes)\n";
echo 'Tables: ' . implode(', ', $tables) . "\n";
echo 'Migration stubs: ' . count($migrationNames) . "\n";
