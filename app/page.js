commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/app/page.js b/app/page.js
index 023c8fd..503727b 100644
--- a/app/page.js
+++ b/app/page.js
@@ -5,6 +5,8 @@ import { buildConditionNoteOptions, EMPTY_DEAL, extractTextBlastPhotoLink, getMi
 import { buildPublishedDealRecord, buildTrackingOnlyDealRecord } from '../lib/dealRecord.mjs';
 import { buildTextBlast } from '../lib/textBlast.mjs';
 import { safeHtmlTemplate } from '../lib/htmlSecurity.mjs';
+import { getPhoneChoicesForState, getPrimaryPhoneForState } from '../lib/contactPhone.mjs';
+import { reorderItems } from '../lib/photoOrder.mjs';
 
 // House Icon Component
 const HouseIcon = () => (
@@ -73,6 +75,7 @@ export default function OMDGenerator() {
   const [polishOptions, setPolishOptions] = useState([]);
   const [selectedPolishOption, setSelectedPolishOption] = useState('');
   const [polishSource, setPolishSource] = useState('');
+  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
 
   // Create truthful buyer-facing choices without sending deal facts to an outside service.
   const polishNotes = () => {
@@ -93,6 +96,17 @@ export default function OMDGenerator() {
     setPolishNotice(`${option.label} version selected. You can still choose another option below.`);
   };
 
+  const updateFormField = (field, value) => {
+    setFormData((current) => {
+      if (field !== 'state') return { ...current, [field]: value };
+      return {
+        ...current,
+        state: value,
+        phone: getPrimaryPhoneForState(value)
+      };
+    });
+  };
+
   // CLIENT-SIDE PARSER - No API needed, instant and reliable
   const parseInput = () => {
     if (!rawInput.trim()) return;
@@ -144,12 +158,12 @@ export default function OMDGenerator() {
 
   const movePhoto = (index, direction) => {
     const newIndex = index + direction;
-    if (newIndex < 0 || newIndex >= photos.length) return;
-    const updated = [...photos];
-    const temp = updated[index];
-    updated[index] = updated[newIndex];
-    updated[newIndex] = temp;
-    setPhotos(updated);
+    setPhotos((current) => reorderItems(current, index, newIndex));
+  };
+
+  const movePhotoTo = (fromIndex, toIndex) => {
+    setPhotos((current) => reorderItems(current, fromIndex, toIndex));
+    setDraggedPhotoIndex(null);
   };
 
   const removePhoto = (index) => {
@@ -215,7 +229,11 @@ export default function OMDGenerator() {
     setPublishing(true);
     setDealNumber('');
     try {
-      const pendingRecord = buildPublishedDealRecord({ formData, photos: [] });
+      const marketing = {
+        textBlastPhotoLink,
+        facebookVariantOffset
+      };
+      const pendingRecord = buildPublishedDealRecord({ formData, photos: [], marketing });
       const slug = pendingRecord.slug;
       
       const uploadedPhotos = await uploadPhotosToSupabase(slug);
@@ -223,6 +241,7 @@ export default function OMDGenerator() {
       const dealData = buildPublishedDealRecord({
         formData,
         photos: uploadedPhotos,
+        marketing,
         suffix: slug.split('-').pop()
       }).data;
       
@@ -526,19 +545,45 @@ export default function OMDGenerator() {
             <div style={{ marginTop: 30 }}>
               <h3>Deal Details</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
-                {Object.entries(formData).filter(([key]) => key !== 'conditionNotes').map(([key, value]) => (
-                  <div key={key}>
-                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#666', textTransform: 'capitalize' }}>
-                      {key.replace(/([A-Z])/g, ' $1')}
-                    </label>
-                    <input
-                      type="text"
-                      value={value}
-                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
-                      style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
-                    />
-                  </div>
-                ))}
+                {Object.entries(formData).filter(([key]) => key !== 'conditionNotes').map(([key, value]) => {
+                  const phoneChoices = key === 'phone' ? getPhoneChoicesForState(formData.state) : [];
+                  const mappedPhone = getPrimaryPhoneForState(formData.state);
+                  return (
+                    <div key={key}>
+                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#666', textTransform: 'capitalize' }}>
+                        {key === 'phone' ? 'Contact Phone (automatic)' : key.replace(/([A-Z])/g, ' $1')}
+                      </label>
+                      {key === 'phone' ? (
+                        <>
+                          <select
+                            value={value}
+                            onChange={(e) => updateFormField('phone', e.target.value)}
+                            style={{ width: '100%', padding: 10, border: mappedPhone ? '2px solid #00b894' : '2px solid #d97706', borderRadius: 6, background: 'white' }}
+                          >
+                            {!value && <option value="">Choose the correct market number</option>}
+                            {phoneChoices.map((choice) => (
+                              <option key={`${choice.state}-${choice.phone}`} value={choice.phone}>
+                                {choice.label}: {choice.phone}
+                              </option>
+                            ))}
+                          </select>
+                          <div style={{ marginTop: 5, fontSize: 11, color: mappedPhone ? '#008f73' : '#8a5a00' }}>
+                            {mappedPhone
+                              ? `Selected automatically from ${formData.state || 'the property state'}.`
+                              : 'This state is not mapped. Choose an approved number before publishing.'}
+                          </div>
+                        </>
+                      ) : (
+                        <input
+                          type="text"
+                          value={value}
+                          onChange={(e) => updateFormField(key, e.target.value)}
+                          style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
+                        />
+                      )}
+                    </div>
+                  );
+                })}
               </div>
               <div style={{ marginTop: 15 }}>
                 <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#666' }}>Condition Notes</label>
@@ -625,15 +670,44 @@ export default function OMDGenerator() {
                 {photos.length > 0 && ` Total size: ${formatSize(totalPhotoSize)}`}
               </p>
               <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} />
-              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 15 }}>
+              {photos.length > 0 && (
+                <p style={{ color: '#475467', fontSize: 13, margin: '12px 0 0' }}>
+                  Drag a photo card to reorder it. The first photo is the cover. Large move buttons also work on phones.
+                </p>
+              )}
+              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginTop: 15 }}>
                 {photos.map((photo, index) => (
-                  <div key={index} style={{ position: 'relative' }}>
-                    <img src={photo.url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
-                    <div style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>{formatSize(photo.size)}</div>
+                  <div
+                    key={photo.url}
+                    draggable
+                    onDragStart={() => setDraggedPhotoIndex(index)}
+                    onDragEnd={() => setDraggedPhotoIndex(null)}
+                    onDragOver={(event) => event.preventDefault()}
+                    onDrop={(event) => {
+                      event.preventDefault();
+                      if (draggedPhotoIndex !== null) movePhotoTo(draggedPhotoIndex, index);
+                    }}
+                    style={{
+                      position: 'relative',
+                      padding: 10,
+                      borderRadius: 10,
+                      border: index === 0 ? '2px solid #00b894' : draggedPhotoIndex === index ? '2px dashed #667085' : '1px solid #d8dee8',
+                      background: index === 0 ? '#eefbf7' : '#fff',
+                      cursor: 'grab'
+                    }}
+                  >
+                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, gap: 8 }}>
+                      <strong style={{ color: index === 0 ? '#008f73' : '#344054', fontSize: 12 }}>
+                        {index === 0 ? 'Cover photo' : `Photo ${index + 1}`}
+                      </strong>
+                      <span style={{ fontSize: 11, color: '#667085' }}>☰ Drag</span>
+                    </div>
+                    <img src={photo.url} alt={photo.label || `Property photo ${index + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
+                    <div style={{ fontSize: 10, color: '#999', textAlign: 'center', marginTop: 4 }}>{formatSize(photo.size)}</div>
                     <select
                       value={photo.label}
                       onChange={(e) => labelPhoto(index, e.target.value)}
-                      style={{ width: '100%', marginTop: 5, padding: 5, fontSize: 12 }}
+                      style={{ width: '100%', marginTop: 7, padding: 7, fontSize: 12, border: '1px solid #d0d5dd', borderRadius: 6, background: 'white' }}
                     >
                       <option>Exterior - Front</option>
                       <option>Exterior - Back</option>
@@ -653,24 +727,31 @@ export default function OMDGenerator() {
                       <option>Attic</option>
                       <option>Other</option>
                     </select>
-                    <button onClick={() => removePhoto(index)} style={{ position: 'absolute', top: 5, right: 5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer' }}>×</button>
-                    {/* Move buttons */}
-                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
-                      <button 
-                        onClick={() => movePhoto(index, -1)} 
+                    <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
+                      <button
+                        type="button"
+                        onClick={() => movePhoto(index, -1)}
                         disabled={index === 0}
-                        style={{ flex: 1, padding: '4px', fontSize: 12, cursor: index === 0 ? 'default' : 'pointer', background: index === 0 ? '#eee' : '#ddd', border: 'none', borderRadius: 4 }}
+                        style={{ flex: 1, padding: '8px 5px', fontSize: 11, cursor: index === 0 ? 'default' : 'pointer', background: index === 0 ? '#f2f4f7' : '#e8edf3', color: '#344054', border: 'none', borderRadius: 6, fontWeight: 600 }}
                       >
-                        ←
+                        ← Earlier
                       </button>
-                      <button 
-                        onClick={() => movePhoto(index, 1)} 
+                      <button
+                        type="button"
+                        onClick={() => movePhoto(index, 1)}
                         disabled={index === photos.length - 1}
-                        style={{ flex: 1, padding: '4px', fontSize: 12, cursor: index === photos.length - 1 ? 'default' : 'pointer', background: index === photos.length - 1 ? '#eee' : '#ddd', border: 'none', borderRadius: 4 }}
+                        style={{ flex: 1, padding: '8px 5px', fontSize: 11, cursor: index === photos.length - 1 ? 'default' : 'pointer', background: index === photos.length - 1 ? '#f2f4f7' : '#e8edf3', color: '#344054', border: 'none', borderRadius: 6, fontWeight: 600 }}
                       >
-                        →
+                        Later →
                       </button>
                     </div>
+                    <button
+                      type="button"
+                      onClick={() => removePhoto(index)}
+                      style={{ width: '100%', marginTop: 7, padding: '8px 10px', background: '#fff1f1', color: '#b42318', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
+                    >
+                      Delete photo
+                    </button>
                   </div>
                 ))}
               </div>
@@ -1090,10 +1171,10 @@ export default function OMDGenerator() {
             </button>
             <button 
               onClick={publishDeal} 
-              disabled={publishing}
-              style={{ flex: 1, background: '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
+              disabled={publishing || !formData.phone}
+              style={{ flex: 1, background: publishing || !formData.phone ? '#aeb7c6' : '#00b894', color: 'white', border: 'none', padding: 15, borderRadius: 8, cursor: publishing || !formData.phone ? 'not-allowed' : 'pointer', fontWeight: 600 }}
             >
-              {publishing ? (uploadProgress || 'Publishing...') : 'Publish Deal'}
+              {publishing ? (uploadProgress || 'Publishing...') : !formData.phone ? 'Select Contact Number First' : 'Publish Deal'}
             </button>
           </div>
 
