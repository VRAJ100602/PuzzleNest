import sqlite3
import os

BASE = os.path.dirname(os.path.abspath(__file__))

DB_PATHS = [
    os.path.join(BASE, "puzzle_hub.db"),
    os.path.join(BASE, "sql_app.db"),
]

MIGRATIONS = [
    # Original columns
    ("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0;",          "coins"),
    ("ALTER TABLE users ADD COLUMN achievements TEXT DEFAULT '[]';",   "achievements"),
    ("ALTER TABLE users ADD COLUMN store_purchases TEXT DEFAULT '[]';","store_purchases"),
    # New columns (v2 – daily rewards + login streak)
    ("ALTER TABLE users ADD COLUMN last_login_date TEXT;",             "last_login_date"),
    ("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0;",   "login_streak"),
    # v3 – Premium subscription
    ("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT 0 NOT NULL;", "is_premium"),
    ("ALTER TABLE users ADD COLUMN premium_until DATETIME;",               "premium_until"),
    ("ALTER TABLE users ADD COLUMN razorpay_customer_id VARCHAR;",         "razorpay_customer_id"),
    # v4 – optional email for password recovery
    ("ALTER TABLE users ADD COLUMN email VARCHAR;",                        "email"),
    ("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_unique ON users(email) WHERE email IS NOT NULL;", "ix_users_email_unique"),
    # v5 – single-use password reset tokens
    ("ALTER TABLE users ADD COLUMN password_changed_at DATETIME;",        "password_changed_at"),
]

def run_migration():
    for db_path in DB_PATHS:
        if not os.path.exists(db_path):
            print(f"Skipping {db_path} (not found)")
            continue

        print(f"\nMigrating {db_path} ...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        for sql, label in MIGRATIONS:
            try:
                cursor.execute(sql)
                print(f"  [OK] Added column: {label}")
            except sqlite3.OperationalError as e:
                print(f"  -- {label}: {e}")

        conn.commit()
        conn.close()
        print(f"  Done.")

    print("\nAll migrations complete.")

if __name__ == "__main__":
    run_migration()
