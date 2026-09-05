function DataTable({ columns, rows }) {
  return (
    <div className="table-wrapper">
      <table className="enterprise-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? `${row.customer ?? 'row'}-${index}`}>
              {columns.map((column) => (
                <td key={`${row.id ?? index}-${column.key}`}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
