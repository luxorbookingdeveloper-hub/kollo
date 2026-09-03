/* ============================================================================
   كله — Kollo | Module: Documents (شنطة المستندات)
   Document expiry tracking, IDs, Passports, and Licenses
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.docs = () =>
  collectionView('documents', {
    emptyTitle: 'شنطة المستندات فاضية',
    emptyText: 'سجّل البطاقة/الباسبور/الرخصة وتاريخ الانتهاء — وهننبّهك قبلها بـ٩٠/٣٠/٧ يوم.'
  });
