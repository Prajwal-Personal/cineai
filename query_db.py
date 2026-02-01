import sqlite3

conn = sqlite3.connect('smartcut.db')
cursor = conn.cursor()

# Get tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in cursor.fetchall()]
print("Tables:", tables)

# Get schema for each table
for table in tables:
    print(f"\n--- {table} schema ---")
    cursor.execute(f"PRAGMA table_info({table})")
    cols = cursor.fetchall()
    for col in cols:
        print(f"  {col[1]} ({col[2]})")

# Try to get video with id 30
for table in tables:
    try:
        cursor.execute(f"SELECT * FROM {table} WHERE id = 30")
        row = cursor.fetchone()
        if row:
            print(f"\n=== Found in {table} ===")
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [c[1] for c in cursor.fetchall()]
            for i, col in enumerate(cols):
                print(f"  {col}: {row[i]}")
    except:
        pass

conn.close()
