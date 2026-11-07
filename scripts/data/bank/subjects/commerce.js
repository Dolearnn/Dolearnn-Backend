// Original WAEC/NECO/JAMB-style Commerce questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'commerce',
  name: 'Commerce',
  sortOrder: 12,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'trade', name: 'Home and Foreign Trade' },
    { slug: 'business-organisations', name: 'Business Organisations' },
    { slug: 'aids-to-trade', name: 'Aids to Trade' },
    { slug: 'insurance', name: 'Insurance' },
    { slug: 'documents', name: 'Business Documents' },
  ],
  questions: [
    ['trade', 'Buying goods in large quantities from manufacturers and selling in smaller quantities to retailers is', ['wholesale trade', 'retail trade', 'foreign trade', 'entrepôt trade'], 0, 'The wholesaler links manufacturers and retailers by breaking bulk.'],
    ['trade', 'Trade in which goods are imported in order to be re-exported is', ['entrepôt trade', 'barter', 'home trade', 'visible trade'], 0, 'Entrepôt (re-export) trade imports goods to send them on to other countries.'],
    ['business-organisations', 'A partner who contributes capital but takes no part in running the business is', ['a dormant (sleeping) partner', 'a general partner', 'a nominal partner', 'an active partner'], 0, 'A dormant partner invests capital but does not take part in management.'],
    ['business-organisations', 'In a limited liability company, a shareholder can lose at most', ['the amount they agreed to pay for their shares', 'all their personal property', "the company's total debts", 'twice their share capital'], 0, "Limited liability means a shareholder's loss is limited to their investment in shares."],
    ['business-organisations', 'The document that regulates the internal management of a company is the', ['Articles of Association', 'Memorandum of Association', 'prospectus', 'certificate of incorporation'], 0, 'The Articles govern internal affairs; the Memorandum governs relations with the outside world.'],
    ['aids-to-trade', 'Which of these is NOT an aid to trade?', ['Manufacturing', 'Banking', 'Insurance', 'Advertising'], 0, 'Aids to trade include banking, insurance, transport, communication, warehousing and advertising; manufacturing is production.'],
    ['aids-to-trade', 'The most suitable means of moving crude oil over long distances on land is', ['pipeline', 'air', 'road', 'bicycle'], 0, 'Pipelines carry liquids such as crude oil cheaply and continuously over long distances.'],
    ['aids-to-trade', 'A cheque that can only be paid into a bank account is', ['a crossed cheque', 'an open cheque', 'a bearer cheque', 'a stale cheque'], 0, 'Two parallel lines across a cheque (crossing) mean it must be paid into an account.'],
    ['insurance', 'The principle that requires the insured to disclose all material facts is', ['utmost good faith (uberrimae fidei)', 'indemnity', 'subrogation', 'contribution'], 0, 'Utmost good faith obliges both parties to disclose all material facts.'],
    ['insurance', 'The principle that restores the insured to the financial position he was in just before the loss is', ['indemnity', 'insurable interest', 'proximate cause', 'utmost good faith'], 0, 'Indemnity means compensation equal to the actual loss, no more and no less.'],
    ['documents', 'A document sent by a seller to a buyer stating the goods supplied and the amount due is', ['an invoice', 'a receipt', 'a quotation', 'an order'], 0, 'The invoice is the bill showing goods supplied, prices and the total due.'],
    ['documents', 'A document issued by a seller to correct an overcharge on an invoice is', ['a credit note', 'a debit note', 'a pro-forma invoice', 'a delivery note'], 0, 'A credit note reduces the amount the buyer owes; a debit note increases it.'],
  ],
};
