document.addEventListener('DOMContentLoaded', () => {
  let gridInstance = null;
  let allData = [];

  async function fetchHistory() {
    const res = await fetch('/api/history');
    const json = await res.json();
    return json.items || [];
  }

  async function deleteRecord(id) {
    await fetch('/api/history/' + id, { method: 'DELETE' });
    allData = allData.filter(item => item.id !== id);
    gridInstance.updateConfig({ data: formatData(allData) }).forceRender();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatData(items) {
    return items.map(item => [
      item.userId,
      item.expression,
      item.result,
      formatDate(item.createdAt),
      formatDate(item.modifiedAt),
      item.id,
    ]);
  }

  async function init() {
    allData = await fetchHistory();

    gridInstance = new gridjs.Grid({
      columns: [
        { name: 'User', width: '100px' },
        { name: 'Expression', width: '180px' },
        { name: 'Result', width: '120px' },
        { name: 'Created', width: '180px' },
        { name: 'Modified', width: '180px' },
        {
          name: 'Actions',
          width: '80px',
          sort: false,
          formatter: (cell) => {
            return gridjs.h('button', {
              className: 'delete-btn',
              onClick: () => deleteRecord(cell),
            }, 'Delete');
          },
        },
      ],
      data: formatData(allData),
      search: true,
      sort: true,
      pagination: {
        limit: 20,
      },
      language: {
        search: { placeholder: 'Search history...' },
        pagination: {
          previous: 'Prev',
          next: 'Next',
        },
      },
    }).render(document.getElementById('history-grid'));
  }

  init().catch(err => {
    console.error('Failed to load history:', err);
    document.getElementById('history-grid').textContent = 'Failed to load history data.';
  });
});
