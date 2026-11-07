// Original WAEC/NECO/JAMB-style Financial Accounting questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'financial-accounting',
  name: 'Financial Accounting',
  sortOrder: 13,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'bookkeeping', name: 'Bookkeeping and Double Entry' },
    { slug: 'trial-balance', name: 'Trial Balance and Errors' },
    { slug: 'final-accounts', name: 'Final Accounts' },
    { slug: 'depreciation', name: 'Depreciation' },
    { slug: 'bank-reconciliation', name: 'Bank Reconciliation' },
  ],
  questions: [
    ['bookkeeping', 'The accounting equation is', ['Assets = Capital + Liabilities', 'Assets = Capital − Liabilities', 'Capital = Assets + Liabilities', 'Liabilities = Assets + Capital'], 0, 'Everything a business owns is financed by the owner (capital) or by others (liabilities).'],
    ['bookkeeping', 'Goods bought on credit from Ade are recorded by', ["debiting purchases account and crediting Ade's account", "debiting Ade's account and crediting purchases account", 'debiting cash and crediting purchases', 'debiting purchases and crediting cash'], 0, 'Purchases (an expense) is debited; Ade, now a creditor, is credited.'],
    ['bookkeeping', 'The book of original entry for credit sales is the', ['sales day book', 'purchases day book', 'cash book', 'journal proper'], 0, 'Credit sales are first recorded in the sales day book (sales journal).'],
    ['bookkeeping', 'Capital expenditure is spending on', ['acquiring or improving non-current assets', 'paying wages', 'buying goods for resale', 'paying electricity bills'], 0, 'Capital expenditure buys or improves long-term assets; the others are revenue expenditure.'],
    ['trial-balance', 'Which error will NOT be revealed by a trial balance?', ['Error of omission', 'A debit entered as a credit in one account only', 'Wrong addition of one ledger account', 'Posting only one side of an entry'], 0, 'If a transaction is left out completely, both sides are missing and the totals still agree.'],
    ['final-accounts', 'Gross profit is', ['sales minus cost of sales', 'sales minus expenses', 'net profit plus drawings', 'purchases minus returns outwards'], 0, 'Gross profit = net sales − cost of goods sold.'],
    ['final-accounts', 'Opening stock is ₦20,000, purchases ₦80,000 and closing stock ₦15,000. Cost of sales is', ['₦85,000', '₦115,000', '₦75,000', '₦95,000'], 0, '20,000 + 80,000 − 15,000 = ₦85,000.'],
    ['final-accounts', 'Drawings are', ['goods or money taken by the owner for personal use', 'expenses of the business', 'liabilities of the business', 'income of the business'], 0, 'Drawings reduce capital; they are not business expenses.'],
    ['depreciation', 'A machine costing ₦500,000 with scrap value ₦50,000 and a useful life of 5 years is depreciated by the straight-line method. Annual depreciation is', ['₦90,000', '₦100,000', '₦110,000', '₦80,000'], 0, '(500,000 − 50,000) ÷ 5 = ₦90,000.'],
    ['depreciation', 'The reducing balance method charges depreciation as', ['a fixed percentage of the net book value each year', 'the same amount every year', 'a fixed percentage of the original cost each year', 'the scrap value divided by the useful life'], 0, 'Each year the rate is applied to the reduced (net book) value, so the charge falls over time.'],
    ['bank-reconciliation', 'A cheque recorded in the cash book but not yet shown on the bank statement is', ['an unpresented cheque', 'a bank charge', 'a standing order', 'interest received'], 0, 'Unpresented cheques have been issued and recorded but not yet cleared by the bank.'],
    ['bank-reconciliation', 'Bank charges shown on the bank statement but not in the cash book should be', ['credited in the cash book', 'debited in the cash book', 'ignored', 'added to the bank statement balance'], 0, 'Charges reduce the bank balance, so they are credited (paid out) in the cash book.'],
  ],
};
