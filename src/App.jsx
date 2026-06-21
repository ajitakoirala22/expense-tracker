import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'spendwise-v1';
const APP_NAME = 'SpendWise';

const categories = ['All', 'Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Health', 'Other'];

const defaultExpenses = [
  {
    id: 'e1',
    title: 'Lunch with friends',
    amount: 240,
    category: 'Food',
    date: '2026-06-18',
    note: 'Cafeteria lunch after class'
  },
  {
    id: 'e2',
    title: 'Metro pass',
    amount: 520,
    category: 'Travel',
    date: '2026-06-17',
    note: 'Weekly travel card'
  },
  {
    id: 'e3',
    title: 'Course subscription',
    amount: 999,
    category: 'Education',
    date: '2026-06-15',
    note: 'Frontend practice course'
  }
];

const defaultBudget = 10000;

function readSeed() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(date) {
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${date}T12:00:00`));
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function App() {
  const seed = readSeed();
  const [budget, setBudget] = useState(seed?.budget ?? defaultBudget);
  const [expenses, setExpenses] = useState(seed?.expenses ?? defaultExpenses);
  const [categoryFilter, setCategoryFilter] = useState(seed?.categoryFilter ?? 'All');
  const [searchTerm, setSearchTerm] = useState(seed?.searchTerm ?? '');
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    note: ''
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        budget,
        expenses,
        categoryFilter,
        searchTerm
      })
    );
  }, [budget, expenses, categoryFilter, searchTerm]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses]
  );

  const remaining = budget - totalSpent;
  const spentPercent = budget ? clampPercent((totalSpent / budget) * 100) : 0;

  const filteredExpenses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
      const matchesSearch =
        !query ||
        [expense.title, expense.category, expense.note]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [expenses, categoryFilter, searchTerm]);

  const categoryBreakdown = useMemo(() => {
    const totals = categories
      .filter((category) => category !== 'All')
      .map((category) => {
        const amount = expenses
          .filter((expense) => expense.category === category)
          .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        return {
          category,
          amount
        };
      });

    const maxAmount = Math.max(...totals.map((item) => item.amount), 1);

    return totals.map((item) => ({
      ...item,
      percent: Math.round((item.amount / maxAmount) * 100)
    }));
  }, [expenses]);

  const topCategory = useMemo(() => {
    const totals = categoryBreakdown.slice().sort((a, b) => b.amount - a.amount);
    return totals[0] ?? { category: 'None', amount: 0 };
  }, [categoryBreakdown]);

  const handleAddExpense = (event) => {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!form.title.trim() || !amount || amount <= 0) {
      return;
    }

    const newExpense = {
      id: `expense-${Date.now()}`,
      title: form.title.trim(),
      amount,
      category: form.category,
      date: form.date,
      note: form.note.trim()
    };

    setExpenses((current) => [newExpense, ...current]);
    setForm({
      title: '',
      amount: '',
      category: form.category,
      date: new Date().toISOString().slice(0, 10),
      note: ''
    });
  };

  const removeExpense = (id) => {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Simple expense tracker</p>
          <h1>{APP_NAME}</h1>
          <p className="hero__copy">
            Track daily spending, stay inside your budget, and keep everything saved locally in a
            clean React app.
          </p>
        </div>

        <div className="hero__stats">
          <div className="stat-card">
            <span>Budget</span>
            <strong>{formatCurrency(budget)}</strong>
          </div>
          <div className="stat-card">
            <span>Spent</span>
            <strong>{formatCurrency(totalSpent)}</strong>
          </div>
          <div className="stat-card">
            <span>Remaining</span>
            <strong className={remaining < 0 ? 'negative' : 'positive'}>{formatCurrency(remaining)}</strong>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="main-panel">
          <section className="budget-card">
            <div className="section-heading">
              <h2>Monthly budget</h2>
              <span>{spentPercent}% used</span>
            </div>
            <div className="budget-row">
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value) || 0)}
                aria-label="Monthly budget"
              />
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${spentPercent}%` }} />
              </div>
            </div>
            <p className="hint-copy">
              Adjust your monthly budget whenever needed. The app will remember it in your browser.
            </p>
          </section>

          <section className="form-card">
            <div className="section-heading">
              <h2>Add expense</h2>
              <span>Quick entry</span>
            </div>

            <form className="expense-form" onSubmit={handleAddExpense}>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Bus ticket"
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="250"
                />
              </label>
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {categories.filter((item) => item !== 'All').map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label className="expense-form__note">
                Note
                <textarea
                  rows="3"
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Optional note"
                />
              </label>
              <button className="primary-button" type="submit">
                Add expense
              </button>
            </form>
          </section>

          <section className="list-card">
            <div className="section-heading">
              <h2>Expense history</h2>
              <span>{filteredExpenses.length} items</span>
            </div>

            <div className="controls-row">
              <div className="filter-group">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={categoryFilter === category ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search expenses"
              />
            </div>

            <div className="expense-list">
              {filteredExpenses.length ? (
                filteredExpenses.map((expense) => (
                  <article key={expense.id} className="expense-item">
                    <div className="expense-item__main">
                      <div className="expense-item__icon">{expense.category.slice(0, 1)}</div>
                      <div>
                        <h3>{expense.title}</h3>
                        <p>{expense.note || 'No note added'}</p>
                      </div>
                    </div>

                    <div className="expense-item__meta">
                      <span className="category-pill">{expense.category}</span>
                      <strong>{formatCurrency(expense.amount)}</strong>
                      <small>{formatDate(expense.date)}</small>
                    </div>

                    <button className="icon-button" type="button" onClick={() => removeExpense(expense.id)}>
                      ×
                    </button>
                  </article>
                ))
              ) : (
                <div className="empty-state">No expenses match your current filter.</div>
              )}
            </div>
          </section>
        </section>

        <aside className="sidebar">
          <section className="panel">
            <div className="section-heading">
              <h2>Summary</h2>
              <span>This month</span>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>Total expenses</span>
                <strong>{expenses.length}</strong>
              </div>
              <div className="summary-row">
                <span>Average expense</span>
                <strong>{expenses.length ? formatCurrency(totalSpent / expenses.length) : formatCurrency(0)}</strong>
              </div>
              <div className="summary-row">
                <span>Top category</span>
                <strong>{topCategory.category}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <h2>Category split</h2>
              <span>By amount</span>
            </div>

            <div className="breakdown-list">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="breakdown-item">
                  <div className="breakdown-item__top">
                    <span>{item.category}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-fill" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <h2>Budget status</h2>
              <span>Quick read</span>
            </div>
            <p className="budget-copy">
              {remaining >= 0
                ? `You have ${formatCurrency(remaining)} left this month.`
                : `You are over budget by ${formatCurrency(Math.abs(remaining))}.`}
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
