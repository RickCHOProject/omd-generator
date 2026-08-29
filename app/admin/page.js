commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/app/admin/page.js b/app/admin/page.js
index eb289f0..0569318 100644
--- a/app/admin/page.js
+++ b/app/admin/page.js
@@ -3,6 +3,9 @@ import { useEffect, useState } from 'react';
 import { isArchivedDeal, isTrackingOnlyDeal } from '../../lib/dealRecord.mjs';
 import { getPublicDealUrl } from '../../lib/dealLinks.mjs';
 import { safeHtmlTemplate } from '../../lib/htmlSecurity.mjs';
+import { getApprovedPhoneForState, getPhoneChoicesForState, getPrimaryPhoneForState } from '../../lib/contactPhone.mjs';
+import { buildMarketingPackage, getMarketingSettings } from '../../lib/marketingPackage.mjs';
+import { reorderItems } from '../../lib/photoOrder.mjs';
 import SignOutButton from '../../components/SignOutButton';
 import TeamAccess from '../../components/TeamAccess';
 import styles from './admin.module.css';
@@ -30,6 +33,10 @@ export default function AdminPage() {
   const [searchTerm, setSearchTerm] = useState('');
   const [dealFilter, setDealFilter] = useState('all');
   const [currentUser, setCurrentUser] = useState(null);
+  const [marketingDeal, setMarketingDeal] = useState(null);
+  const [marketingSettings, setMarketingSettings] = useState({ textBlastPhotoLink: '', facebookVariantOffset: 0 });
+  const [marketingNotice, setMarketingNotice] = useState('');
+  const [draggedEditPhotoIndex, setDraggedEditPhotoIndex] = useState(null);
 
   // Fetch all deals
   useEffect(() => {
@@ -146,13 +153,57 @@ export default function AdminPage() {
 
   const startEditing = (deal) => {
     setEditingDeal(deal);
-    setEditData({ ...deal.data });
+    setEditData({
+      ...deal.data,
+      phone: getApprovedPhoneForState(deal.data?.state, deal.data?.phone)
+    });
     setSaveMsg('');
     setEmailHTML('');
   };
 
+  const openMarketingPackage = (deal) => {
+    setMarketingDeal(deal);
+    setMarketingSettings(getMarketingSettings(deal.data));
+    setMarketingNotice('');
+  };
+
   const updateField = (field, value) => {
-    setEditData(prev => ({ ...prev, [field]: value }));
+    setEditData((current) => {
+      if (field !== 'state') return { ...current, [field]: value };
+      return {
+        ...current,
+        state: value,
+        phone: getPrimaryPhoneForState(value)
+      };
+    });
+  };
+
+  const saveMarketingSettings = async () => {
+    if (!marketingDeal) return;
+    setMarketingNotice('Saving package settings...');
+    const nextData = {
+      ...marketingDeal.data,
+      marketing: {
+        textBlastPhotoLink: String(marketingSettings.textBlastPhotoLink || '').trim(),
+        facebookVariantOffset: Number(marketingSettings.facebookVariantOffset) || 0
+      }
+    };
+
+    try {
+      const response = await fetch('/api/admin/deals', {
+        method: 'PATCH',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ id: marketingDeal.id, data: nextData })
+      });
+      const result = await response.json();
+      if (!response.ok) throw new Error(result.error || 'Package settings could not be saved.');
+      const savedData = result?.[0]?.data || nextData;
+      setMarketingDeal((current) => ({ ...current, data: savedData }));
+      setDeals((current) => current.map((deal) => deal.id === marketingDeal.id ? { ...deal, data: savedData } : deal));
+      setMarketingNotice('Package settings saved.');
+    } catch (error) {
+      setMarketingNotice(error.message || 'Package settings could not be saved.');
+    }
   };
 
   const saveDeal = async () => {
@@ -350,7 +401,7 @@ export default function AdminPage() {
           <tr>
             <td align="center" bgcolor="#1a1a2e" style="background-color:#1a1a2e;padding:25px;">
               <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#ffffff;font-family:Arial,sans-serif;">Interested in this deal?</p>
-              <p style="margin:0;font-size:14px;color:#cccccc;font-family:Arial,sans-serif;">Reply to this email or call/text ${data.phone || '480-266-3864'}</p>
+              <p style="margin:0;font-size:14px;color:#cccccc;font-family:Arial,sans-serif;">Reply to this email or call/text ${data.phone || getPrimaryPhoneForState(data.state) || '480-685-8477'}</p>
               <p style="margin:15px 0 0;font-size:12px;color:#888888;font-family:Arial,sans-serif;">Off Market Daily | Exclusive Investment Properties</p>
             </td>
           </tr>
@@ -589,6 +640,105 @@ export default function AdminPage() {
     );
   }
 
+  // === REUSABLE MARKETING PACKAGE ===
+  if (marketingDeal) {
+    const packageOutput = buildMarketingPackage({
+      data: marketingDeal.data,
+      slug: marketingDeal.slug,
+      settings: marketingSettings
+    });
+    const copyPackageText = async (value, label) => {
+      await navigator.clipboard.writeText(value);
+      setMarketingNotice(`${label} copied.`);
+    };
+
+    return (
+      <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
+        <div style={{ background: '#1a1a2e', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
+          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
+            <button onClick={() => setMarketingDeal(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>← Admin</button>
+            <div>
+              <div style={{ fontWeight: 800, fontSize: 18 }}>Marketing Package</div>
+              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{marketingDeal.data?.address}</div>
+            </div>
+          </div>
+          <button
+            type="button"
+            onClick={() => {
+              const deal = marketingDeal;
+              setMarketingDeal(null);
+              startEditing(deal);
+            }}
+            style={{ background: 'white', color: '#1a1a2e', border: 'none', padding: '9px 15px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
+          >
+            Edit Deal
+          </button>
+        </div>
+
+        <main style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
+          <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
+            <h1 style={{ color: '#1a1a2e', fontSize: 24, margin: '0 0 6px' }}>{marketingDeal.data?.address}</h1>
+            <p style={{ color: '#667085', margin: '0 0 18px', lineHeight: 1.5 }}>
+              Return here anytime to copy the live link, Text Blast, or Facebook post. You do not need to save these in another document.
+            </p>
+            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
+              <a href={packageOutput.dealUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#f8fafc', color: '#344054', border: '1px solid #d0d5dd', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>View OMD Page</a>
+              <button type="button" onClick={() => copyPackageText(packageOutput.dealUrl, 'OMD link')} style={{ padding: '10px 16px', background: '#00b894', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Copy OMD Link</button>
+            </div>
+          </section>
+
+          <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
+            <h2 style={{ color: '#1a1a2e', fontSize: 19, margin: '0 0 8px' }}>Saved package settings</h2>
+            <p style={{ color: '#667085', fontSize: 13, margin: '0 0 12px' }}>Add the Google Drive photo folder once. OMD will keep it with this deal.</p>
+            <label style={{ display: 'block', color: '#344054', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Google Drive photo link</label>
+            <input
+              type="url"
+              value={marketingSettings.textBlastPhotoLink}
+              onChange={(event) => {
+                setMarketingSettings((current) => ({ ...current, textBlastPhotoLink: event.target.value }));
+                setMarketingNotice('Unsaved package changes.');
+              }}
+              placeholder="https://drive.google.com/drive/folders/..."
+              style={{ width: '100%', padding: 11, border: '1px solid #d0d5dd', borderRadius: 8, boxSizing: 'border-box', fontSize: 14 }}
+            />
+            <button type="button" onClick={saveMarketingSettings} style={{ marginTop: 10, padding: '10px 16px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Save Package Settings</button>
+            {marketingNotice && <span style={{ marginLeft: 10, color: marketingNotice.includes('could not') ? '#b42318' : '#116149', fontSize: 13, fontWeight: 600 }}>{marketingNotice}</span>}
+          </section>
+
+          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
+            <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
+              <h2 style={{ color: '#1a1a2e', fontSize: 19, margin: '0 0 6px' }}>Text Blast</h2>
+              <p style={{ color: '#667085', fontSize: 13, margin: '0 0 12px' }}>Ready to copy into GoHighLevel.</p>
+              <textarea readOnly value={packageOutput.textBlast} style={{ width: '100%', minHeight: 260, padding: 12, border: '1px solid #d0d5dd', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }} />
+              <button type="button" onClick={() => copyPackageText(packageOutput.textBlast, 'Text Blast')} style={{ width: '100%', marginTop: 10, padding: 11, background: '#4b5563', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Copy Text Blast</button>
+            </section>
+
+            <section style={{ background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
+              <h2 style={{ color: '#1a1a2e', fontSize: 19, margin: '0 0 6px' }}>Facebook Post</h2>
+              <p style={{ color: '#667085', fontSize: 13, margin: '0 0 12px' }}>Refresh changes the wording, never the deal facts.</p>
+              <textarea readOnly value={packageOutput.facebookPost} style={{ width: '100%', minHeight: 260, padding: 12, border: '1px solid #d0d5dd', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }} />
+              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
+                <button type="button" onClick={() => copyPackageText(packageOutput.facebookPost, 'Facebook post')} style={{ flex: 1, padding: 11, background: '#1877f2', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Copy Facebook Post</button>
+                <button
+                  type="button"
+                  onClick={() => {
+                    setMarketingSettings((current) => ({ ...current, facebookVariantOffset: current.facebookVariantOffset + 1 }));
+                    setMarketingNotice('New Facebook variation selected. Save package settings to keep it.');
+                  }}
+                  style={{ padding: '11px 15px', background: '#eef2f7', color: '#344054', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
+                >
+                  Refresh
+                </button>
+              </div>
+            </section>
+          </div>
+
+          <p style={{ color: '#667085', fontSize: 13, margin: '16px 2px 0' }}>Email HTML remains available under Edit Deal and can be expanded later when email outreach becomes active.</p>
+        </main>
+      </div>
+    );
+  }
+
   // === EDIT PANEL ===
   if (editingDeal) {
     return (
@@ -652,26 +802,38 @@ export default function AdminPage() {
                 { key: 'hoa', label: 'HOA' },
                 { key: 'phone', label: 'Contact Phone' },
                 { key: 'conditionNotes', label: 'Condition Notes', full: true, textarea: true }
-              ].map(field => (
-                <div key={field.key} style={{ gridColumn: field.full ? '1 / -1' : 'auto' }}>
-                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 5 }}>{field.label}</label>
-                  {field.textarea ? (
-                    <textarea
-                      value={editData[field.key] || ''}
-                      onChange={(e) => updateField(field.key, e.target.value)}
-                      rows={4}
-                      style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
-                    />
-                  ) : (
-                    <input
-                      type="text"
-                      value={editData[field.key] || ''}
-                      onChange={(e) => updateField(field.key, e.target.value)}
-                      style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
-                    />
-                  )}
-                </div>
-              ))}
+              ].map((field) => {
+                const phoneChoices = field.key === 'phone' ? getPhoneChoicesForState(editData.state) : [];
+                return (
+                  <div key={field.key} style={{ gridColumn: field.full ? '1 / -1' : 'auto' }}>
+                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 5 }}>{field.key === 'phone' ? 'Contact Phone (controlled selection)' : field.label}</label>
+                    {field.textarea ? (
+                      <textarea
+                        value={editData[field.key] || ''}
+                        onChange={(e) => updateField(field.key, e.target.value)}
+                        rows={4}
+                        style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
+                      />
+                    ) : field.key === 'phone' ? (
+                      <select
+                        value={editData.phone || ''}
+                        onChange={(e) => updateField('phone', e.target.value)}
+                        style={{ width: '100%', padding: 12, border: '1px solid #00b894', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: 'white' }}
+                      >
+                        {!editData.phone && <option value="">Choose the approved market number</option>}
+                        {phoneChoices.map((choice) => <option key={`${choice.state}-${choice.phone}`} value={choice.phone}>{choice.label}: {choice.phone}</option>)}
+                      </select>
+                    ) : (
+                      <input
+                        type="text"
+                        value={editData[field.key] || ''}
+                        onChange={(e) => updateField(field.key, e.target.value)}
+                        style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
+                      />
+                    )}
+                  </div>
+                );
+              })}
             </div>
             
             {/* Photos section — full management */}
@@ -679,12 +841,32 @@ export default function AdminPage() {
               <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>
                 Photos ({editData.photos ? editData.photos.length : 0})
               </label>
+              {editData.photos?.length > 0 && (
+                <p style={{ color: '#667085', fontSize: 12, margin: '0 0 10px' }}>Drag cards to reorder. The first photo is the cover. Large buttons also work on phones.</p>
+              )}
               
               {editData.photos && editData.photos.length > 0 && (
-                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
+                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                   {editData.photos.map((photo, i) => (
-                    <div key={i} style={{ position: 'relative', background: '#f8f9fa', borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
-                      <img src={photo.url} alt={photo.label || ''} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
+                    <div
+                      key={photo.url}
+                      draggable
+                      onDragStart={() => setDraggedEditPhotoIndex(i)}
+                      onDragEnd={() => setDraggedEditPhotoIndex(null)}
+                      onDragOver={(event) => event.preventDefault()}
+                      onDrop={(event) => {
+                        event.preventDefault();
+                        if (draggedEditPhotoIndex === null) return;
+                        updateField('photos', reorderItems(editData.photos, draggedEditPhotoIndex, i));
+                        setDraggedEditPhotoIndex(null);
+                      }}
+                      style={{ position: 'relative', background: i === 0 ? '#eefbf7' : '#f8f9fa', borderRadius: 10, overflow: 'hidden', border: i === 0 ? '2px solid #00b894' : draggedEditPhotoIndex === i ? '2px dashed #667085' : '1px solid #d8dee8', cursor: 'grab' }}
+                    >
+                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', color: '#344054', fontSize: 11, fontWeight: 700 }}>
+                        <span>{i === 0 ? 'Cover photo' : `Photo ${i + 1}`}</span>
+                        <span style={{ color: '#667085' }}>☰ Drag</span>
+                      </div>
+                      <img src={photo.url} alt={photo.label || ''} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                       <div style={{ padding: '6px 8px' }}>
                         <input
                           type="text"
@@ -698,35 +880,25 @@ export default function AdminPage() {
                           style={{ width: '100%', padding: 4, border: '1px solid #ddd', borderRadius: 4, fontSize: 11, boxSizing: 'border-box' }}
                         />
                       </div>
-                      <div style={{ display: 'flex', gap: 2, padding: '0 8px 6px' }}>
-                        {i > 0 && (
-                          <button
-                            onClick={() => {
-                              const updated = [...editData.photos];
-                              [updated[i-1], updated[i]] = [updated[i], updated[i-1]];
-                              updateField('photos', updated);
-                            }}
-                            style={{ flex: 1, padding: '4px', background: '#e8e8e8', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
-                          >←</button>
-                        )}
-                        {i < editData.photos.length - 1 && (
-                          <button
-                            onClick={() => {
-                              const updated = [...editData.photos];
-                              [updated[i], updated[i+1]] = [updated[i+1], updated[i]];
-                              updateField('photos', updated);
-                            }}
-                            style={{ flex: 1, padding: '4px', background: '#e8e8e8', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
-                          >→</button>
-                        )}
+                      <div style={{ display: 'flex', gap: 6, padding: '0 8px 6px' }}>
                         <button
-                          onClick={() => {
-                            const updated = editData.photos.filter((_, idx) => idx !== i);
-                            updateField('photos', updated);
-                          }}
-                          style={{ flex: 1, padding: '4px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
-                        >✕</button>
+                          type="button"
+                          disabled={i === 0}
+                          onClick={() => updateField('photos', reorderItems(editData.photos, i, i - 1))}
+                          style={{ flex: 1, padding: '8px 4px', background: i === 0 ? '#f2f4f7' : '#e8edf3', color: '#344054', border: 'none', borderRadius: 6, cursor: i === 0 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600 }}
+                        >← Earlier</button>
+                        <button
+                          type="button"
+                          disabled={i === editData.photos.length - 1}
+                          onClick={() => updateField('photos', reorderItems(editData.photos, i, i + 1))}
+                          style={{ flex: 1, padding: '8px 4px', background: i === editData.photos.length - 1 ? '#f2f4f7' : '#e8edf3', color: '#344054', border: 'none', borderRadius: 6, cursor: i === editData.photos.length - 1 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600 }}
+                        >Later →</button>
                       </div>
+                      <button
+                        type="button"
+                        onClick={() => updateField('photos', editData.photos.filter((_, idx) => idx !== i))}
+                        style={{ width: 'calc(100% - 16px)', margin: '0 8px 8px', padding: '8px', background: '#fff1f1', color: '#b42318', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
+                      >Delete photo</button>
                     </div>
                   ))}
                 </div>
@@ -1064,6 +1236,14 @@ export default function AdminPage() {
                         >
                           Edit
                         </button>
+                        {!isTrackingOnlyDeal(deal.data) && (
+                          <button
+                            onClick={() => openMarketingPackage(deal)}
+                            style={{ padding: '6px 14px', background: '#1877f2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
+                          >
+                            Marketing
+                          </button>
+                        )}
                         {!isTrackingOnlyDeal(deal.data) && !isArchivedDeal(deal.data) && (
                           <button
                             onClick={() => {
@@ -1124,6 +1304,7 @@ export default function AdminPage() {
                   <div className={styles.mobileActions}>
                     {!trackingOnly && !isArchivedDeal(deal.data) && <button type="button" onClick={() => loadViewDetails(deal.slug)} className={styles.mobileAction}>Analytics</button>}
                     <button type="button" onClick={() => startEditing(deal)} className={styles.mobileActionPrimary}>Edit</button>
+                    {!trackingOnly && <button type="button" onClick={() => openMarketingPackage(deal)} className={styles.mobileActionPrimary}>Marketing</button>}
                     {!trackingOnly && !isArchivedDeal(deal.data) && <a href={getPublicDealUrl(deal.slug)} target="_blank" rel="noopener noreferrer" className={styles.mobileAction}>View page</a>}
                     {!trackingOnly && !isArchivedDeal(deal.data) && (
                       <button type="button" onClick={() => { navigator.clipboard.writeText(getPublicDealUrl(deal.slug)); alert('Link copied!'); }} className={styles.mobileAction}>
