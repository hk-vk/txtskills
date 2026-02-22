declare module "sql.js" {
  interface DatabaseInstance {
    exec(sql: string): void;
    export(): Uint8Array;
    close(): void;
    prepare(sql: string): {
      run(values?: unknown[]): void;
      free(): void;
    };
  }

  interface SQLJsStatic {
    Database: new () => DatabaseInstance;
  }

  export default function initSqlJs(): Promise<SQLJsStatic>;
}
