export const DB_NAME = "BFPVILLADB";
export const DB_VERSION = 8; // Increased version for inspections store
export const STORE_PERSONNEL = "personnel";
export const STORE_CLEARANCE = "clearanceRequests";
export const STORE_INVENTORY = "inventory";
export const STORE_LEAVE = "leaveRequests";
export const STORE_RECRUITMENT = "recruitment";
export const STORE_SESSION = "session";
export const STORE_MEDICAL_RECORDS = "medicalRecords";
export const STORE_TRAININGS = "trainings";
export const STORE_INSPECTIONS = "inspections"; // New store

export async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Personnel store
      if (!db.objectStoreNames.contains(STORE_PERSONNEL)) {
        db.createObjectStore(STORE_PERSONNEL, {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      // Clearance requests
      if (!db.objectStoreNames.contains(STORE_CLEARANCE)) {
        db.createObjectStore(STORE_CLEARANCE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      // Inventory store
      if (!db.objectStoreNames.contains(STORE_INVENTORY)) {
        db.createObjectStore(STORE_INVENTORY, {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      // Leave requests
      if (!db.objectStoreNames.contains(STORE_LEAVE)) {
        db.createObjectStore(STORE_LEAVE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      // Recruitment store
      if (!db.objectStoreNames.contains(STORE_RECRUITMENT)) {
        db.createObjectStore(STORE_RECRUITMENT, {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      // Session store
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION, { keyPath: "key" });
      }

      // Medical Records store
      if (!db.objectStoreNames.contains(STORE_MEDICAL_RECORDS)) {
        const medicalStore = db.createObjectStore(STORE_MEDICAL_RECORDS, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Create indexes for efficient querying
        medicalStore.createIndex("personnelId", "personnelId", {
          unique: false,
        });
        medicalStore.createIndex("recordType", "recordType", { unique: false });
        medicalStore.createIndex("uploadDate", "uploadDate", { unique: false });
        medicalStore.createIndex("fileName", "fileName", { unique: false });
      }

      // Trainings store
      if (!db.objectStoreNames.contains(STORE_TRAININGS)) {
        const trainingsStore = db.createObjectStore(STORE_TRAININGS, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Create indexes for trainings
        trainingsStore.createIndex("personnelId", "personnelId", {
          unique: false,
        });
        trainingsStore.createIndex("date", "date", { unique: false });
        trainingsStore.createIndex("status", "status", { unique: false });
      }

      // Inspections store - NEW
      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        const inspectionsStore = db.createObjectStore(STORE_INSPECTIONS, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Create indexes for inspections
        inspectionsStore.createIndex("equipmentId", "equipmentId", {
          unique: false,
        });
        inspectionsStore.createIndex("inspectorId", "inspectorId", {
          unique: false,
        });
        inspectionsStore.createIndex("inspectionDate", "inspectionDate", {
          unique: false,
        });
        inspectionsStore.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ---------------------------
// Core Helpers
// ---------------------------
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addRecord(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (storeName === STORE_PERSONNEL && !record.documents) {
      record.documents = [];
    }
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.add(record);

    req.onsuccess = (e) => {
      resolve({ ...record, id: e.target.result });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateRecord(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!record.id) {
      reject(new Error("Missing record ID"));
      return;
    }

    if (storeName === STORE_PERSONNEL && !record.documents) {
      record.documents = [];
    }

    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecord(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    console.log("Deleting key:", key, "type:", typeof key);

    const numericKey =
      typeof key === "object"
        ? key.id
        : typeof key === "string"
        ? Number(key)
        : key;

    if (isNaN(numericKey)) {
      reject(new Error(`Invalid key for delete: ${key}`));
      return;
    }

    const req = store.delete(numericKey);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------
// Store-specific Getters
// ---------------------------
export async function getLeaveRequests() {
  return await getAll(STORE_LEAVE);
}

export async function getPersonnelList() {
  return await getAll(STORE_PERSONNEL);
}

export async function getClearanceRequests() {
  return await getAll(STORE_CLEARANCE);
}

export async function getInventoryItems() {
  return await getAll(STORE_INVENTORY);
}

export async function getRecruitmentRecords() {
  return await getAll(STORE_RECRUITMENT);
}

// ---------------------------
// Trainings Specific Functions
// ---------------------------

// Get all trainings
export async function getTrainings() {
  return await getAll(STORE_TRAININGS);
}

// Add a new training
export async function addTraining(training) {
  // Make sure personnelId is stored as a number for consistency
  const trainingWithId = {
    ...training,
    personnelId: parseInt(training.personnelId), // Convert to number
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };
  return await addRecord(STORE_TRAININGS, trainingWithId);
}

// Update a training
export async function updateTraining(id, training) {
  const trainingWithId = {
    ...training,
    personnelId: parseInt(training.personnelId), // Convert to number
    id: id,
    updatedAt: new Date().toISOString(),
  };
  return await updateRecord(STORE_TRAININGS, trainingWithId);
}

// Delete a training
export async function deleteTraining(id) {
  return await deleteRecord(STORE_TRAININGS, id);
}

// Get trainings with personnel details
export async function getTrainingsWithPersonnel() {
  const [trainings, personnelList] = await Promise.all([
    getTrainings(),
    getPersonnelList(),
  ]);

  const personnelMap = new Map();
  personnelList.forEach((person) => {
    personnelMap.set(person.id.toString(), person);
  });

  return trainings.map((training) => {
    const personnelId = training.personnelId
      ? training.personnelId.toString()
      : null;
    const personnel = personnelId ? personnelMap.get(personnelId) : null;

    // Combine first, middle, and last name
    const fullName = personnel
      ? `${personnel.first_name} ${personnel.middle_name} ${personnel.last_name}`
      : training.fullName || "Unknown";

    return {
      ...training,
      personnel: personnel || {},
      fullName: fullName,
      rank: personnel ? personnel.rank : training.rank || "Unknown",
    };
  });
}

// Get trainings by personnel ID
export async function getTrainingsByPersonnel(personnelId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRAININGS, "readonly");
    const store = tx.objectStore(STORE_TRAININGS);
    const index = store.index("personnelId");
    const req = index.getAll(personnelId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------
// Inspections Specific Functions
// ---------------------------

// Get all inspections
export async function getInspections() {
  return await getAll(STORE_INSPECTIONS);
}

// Add a new inspection
export async function addInspection(inspection) {
  const inspectionWithId = {
    ...inspection,
    equipmentId: parseInt(inspection.equipmentId),
    inspectorId: parseInt(inspection.inspectorId),
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };
  return await addRecord(STORE_INSPECTIONS, inspectionWithId);
}

// Update an inspection
export async function updateInspection(id, inspection) {
  const inspectionWithId = {
    ...inspection,
    equipmentId: parseInt(inspection.equipmentId),
    inspectorId: parseInt(inspection.inspectorId),
    id: id,
    updatedAt: new Date().toISOString(),
  };
  return await updateRecord(STORE_INSPECTIONS, inspectionWithId);
}

// Delete an inspection
export async function deleteInspection(id) {
  return await deleteRecord(STORE_INSPECTIONS, id);
}

// Get inspections with equipment and inspector details
export async function getInspectionsWithDetails() {
  const [inspections, inventory, personnel] = await Promise.all([
    getInspections(),
    getInventoryItems(),
    getPersonnelList(),
  ]);

  const inventoryMap = new Map();
  inventory.forEach((item) => {
    inventoryMap.set(item.id.toString(), item);
  });

  const personnelMap = new Map();
  personnel.forEach((person) => {
    personnelMap.set(person.id.toString(), person);
  });

  return inspections.map((inspection) => {
    const equipmentId = inspection.equipmentId
      ? inspection.equipmentId.toString()
      : null;
    const inspectorId = inspection.inspectorId
      ? inspection.inspectorId.toString()
      : null;

    const equipment = equipmentId ? inventoryMap.get(equipmentId) : null;
    const inspector = inspectorId ? personnelMap.get(inspectorId) : null;

    return {
      ...inspection,
      equipment: equipment || {},
      inspector: inspector || {},
      equipmentName: equipment ? equipment.itemName : "Unknown Equipment",
      inspectorName: inspector
        ? `${inspector.first_name} ${inspector.last_name}`
        : "Unknown Inspector",
    };
  });
}

// Get inspections by equipment ID
export async function getInspectionsByEquipment(equipmentId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INSPECTIONS, "readonly");
    const store = tx.objectStore(STORE_INSPECTIONS);
    const index = store.index("equipmentId");
    const req = index.getAll(equipmentId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get inspections by inspector ID
export async function getInspectionsByInspector(inspectorId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INSPECTIONS, "readonly");
    const store = tx.objectStore(STORE_INSPECTIONS);
    const index = store.index("inspectorId");
    const req = index.getAll(inspectorId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get recent inspections (last 30 days)
export async function getRecentInspections() {
  const inspections = await getInspections();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return inspections.filter((inspection) => {
    const inspectionDate = new Date(inspection.inspectionDate);
    return inspectionDate >= thirtyDaysAgo;
  });
}

// ---------------------------
// Personnel Functions
// ---------------------------

// Get all personnel with their trainings
export async function getAllPersonnel() {
  const personnel = await getPersonnelList();

  // Get all trainings to associate with personnel
  const trainings = await getTrainings();

  return personnel.map((person) => {
    // Find trainings for this personnel
    const personTrainings = trainings.filter(
      (training) => training.fullName === person.fullName
    );

    return {
      ...person,
      trainings: personTrainings,
    };
  });
}

// ---------------------------
// Medical Records Functions
// ---------------------------

// Convert file to ArrayBuffer for storage
function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export const addMedicalRecord = async (recordData, file) => {
  try {
    const fileArrayBuffer = await fileToArrayBuffer(file);

    const generateId = () =>
      Date.now() + Math.random().toString(36).substr(2, 9);

    const completeRecord = {
      ...recordData,
      id: generateId(),
      fileData: fileArrayBuffer,
      fileType: file.type,
      fileSize: file.size,
      blobUrl: URL.createObjectURL(file),
      uploadDate: recordData.uploadDate || new Date().toISOString(),
    };

    const result = await addRecord(STORE_MEDICAL_RECORDS, completeRecord);
    console.log("Medical record saved successfully");
    return result;
  } catch (error) {
    console.error("Error in addMedicalRecord:", error);
    throw error;
  }
};

// Helper function to convert ArrayBuffer back to blob URL
export function arrayBufferToBlobUrl(arrayBuffer, mimeType) {
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

// Update getMedicalRecordsWithPersonnel to regenerate blob URLs
export async function getMedicalRecordsWithPersonnel() {
  const [medicalRecords, personnelList] = await Promise.all([
    getMedicalRecords(),
    getPersonnelList(),
  ]);

  const personnelMap = new Map();
  personnelList.forEach((person) => {
    personnelMap.set(person.id, person);
  });

  return medicalRecords.map((record) => {
    let downloadUrl = null;
    if (record.fileData) {
      downloadUrl = arrayBufferToBlobUrl(record.fileData, record.fileType);
    }

    return {
      ...record,
      personnel: personnelMap.get(record.personnelId) || {},
      downloadUrl: downloadUrl,
    };
  });
}

// Get all medical records
export async function getMedicalRecords() {
  return await getAll(STORE_MEDICAL_RECORDS);
}

// Get medical records by personnel ID
export async function getMedicalRecordsByPersonnel(personnelId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDICAL_RECORDS, "readonly");
    const store = tx.objectStore(STORE_MEDICAL_RECORDS);
    const index = store.index("personnelId");
    const req = index.getAll(personnelId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get medical record by ID with file data
export async function getMedicalRecord(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDICAL_RECORDS, "readonly");
    const store = tx.objectStore(STORE_MEDICAL_RECORDS);
    const req = store.get(id);

    req.onsuccess = () => {
      const record = req.result;
      if (record && record.fileData) {
        const blob = new Blob([record.fileData], { type: record.fileType });
        record.blobUrl = URL.createObjectURL(blob);
      }
      resolve(record);
    };
    req.onerror = () => reject(req.error);
  });
}

// Update medical record
export async function updateMedicalRecord(record) {
  return await updateRecord(STORE_MEDICAL_RECORDS, record);
}

// Delete medical record
export async function deleteMedicalRecord(id) {
  return await deleteRecord(STORE_MEDICAL_RECORDS, id);
}

export async function migratePersonnelDocumentsToMedicalRecords() {
  try {
    console.log("=== STARTING MIGRATION ===");

    const [medicalRecords, personnelList] = await Promise.all([
      getMedicalRecords(),
      getPersonnelList(),
    ]);

    console.log("Existing medical records:", medicalRecords.length);
    console.log("Personnel records:", personnelList.length);

    const existingMedicalRecords = new Map();
    medicalRecords.forEach((record) => {
      const key = `${record.personnelId}-${record.documentName}`;
      existingMedicalRecords.set(key, record);
    });

    let migrationCount = 0;
    let medicalDocCount = 0;
    let deletionCount = 0;

    // First, check for medical records that no longer exist in personnel documents
    for (const [key, medicalRecord] of existingMedicalRecords.entries()) {
      const [personnelId, documentName] = key.split("-");
      const person = personnelList.find((p) => p.id.toString() === personnelId);

      if (person) {
        const docExists = person.documents?.some(
          (doc) =>
            doc.name === documentName &&
            (doc.category === "Medical Record" ||
              doc.category?.toLowerCase().includes("medical"))
        );

        if (!docExists) {
          console.log(
            `Deleting orphaned medical record: ${documentName} for person ${personnelId}`
          );
          await deleteMedicalRecord(medicalRecord.id);
          deletionCount++;
        }
      }
    }

    // Then, migrate new documents from personnel to medical records
    for (const person of personnelList) {
      if (person.documents && person.documents.length > 0) {
        const medicalDocs = person.documents.filter(
          (d) =>
            d.category === "Medical Record" ||
            d.category?.toLowerCase().includes("medical") ||
            d.name?.toLowerCase().includes("medical")
        );

        console.log(
          `Person ${person.id} (${person.first_name} ${person.last_name}) has ${medicalDocs.length} medical docs`
        );

        medicalDocCount += medicalDocs.length;

        for (const doc of medicalDocs) {
          const uniqueKey = `${person.id}-${doc.name}`;

          if (!existingMedicalRecords.has(uniqueKey)) {
            console.log(`Migrating: ${doc.name} for person ${person.id}`);

            let recordType = doc.recordType || "General";
            const docName = doc.name?.toLowerCase() || "";

            if (!doc.recordType || doc.recordType === "General") {
              if (docName.includes("dental")) recordType = "Dental";
              else if (
                docName.includes("checkup") ||
                docName.includes("medical")
              )
                recordType = "Checkup";
              else if (docName.includes("lab") || docName.includes("test"))
                recordType = "Lab Test";
              else if (
                docName.includes("imaging") ||
                docName.includes("x-ray") ||
                docName.includes("mri") ||
                docName.includes("scan")
              )
                recordType = "Imaging";
            }

            await addMedicalRecord({
              personnelId: person.id,
              documentName: doc.name,
              recordType: recordType,
              fileName: doc.name,
              uploadDate: doc.uploadedAt || new Date().toISOString(),
              description: `Migrated from personnel documents`,
              category: doc.category || "Medical Record",
            });

            migrationCount++;
          } else {
            console.log(
              `Skipping duplicate: ${doc.name} for person ${person.id}`
            );
          }
        }
      }
    }

    console.log(`=== MIGRATION COMPLETE ===`);
    console.log(`Total medical documents found: ${medicalDocCount}`);
    console.log(`Records migrated: ${migrationCount}`);
    console.log(`Records deleted (orphaned): ${deletionCount}`);
    console.log(`Skipped (duplicates): ${medicalDocCount - migrationCount}`);
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// Synchronize medical records between personnel documents and medical records store
export async function syncMedicalRecords() {
  try {
    console.log("=== STARTING MEDICAL RECORDS SYNC ===");

    const [medicalRecords, personnelList] = await Promise.all([
      getMedicalRecords(),
      getPersonnelList(),
    ]);

    let syncOperations = {
      added: 0,
      removed: 0,
      updated: 0,
    };

    // Create maps for quick lookup
    const medicalRecordsMap = new Map();
    medicalRecords.forEach((record) => {
      const key = `${record.personnelId}-${record.documentName}`;
      medicalRecordsMap.set(key, record);
    });

    const personnelMedicalDocs = new Map();
    personnelList.forEach((person) => {
      if (person.documents) {
        person.documents
          .filter(
            (doc) =>
              doc.category === "Medical Record" ||
              doc.category?.toLowerCase().includes("medical")
          )
          .forEach((doc) => {
            const key = `${person.id}-${doc.name}`;
            personnelMedicalDocs.set(key, { person, doc });
          });
      }
    });

    // Remove medical records that don't exist in personnel documents
    for (const [key, medicalRecord] of medicalRecordsMap.entries()) {
      if (!personnelMedicalDocs.has(key)) {
        console.log(`Removing medical record (not in personnel): ${key}`);
        await deleteMedicalRecord(medicalRecord.id);
        syncOperations.removed++;
      }
    }

    // Add medical records that exist in personnel but not in medical records
    for (const [key, { person, doc }] of personnelMedicalDocs.entries()) {
      if (!medicalRecordsMap.has(key)) {
        console.log(`Adding medical record (from personnel): ${key}`);

        let recordType = doc.recordType || "General";
        const docName = doc.name?.toLowerCase() || "";

        if (!doc.recordType || doc.recordType === "General") {
          if (docName.includes("dental")) recordType = "Dental";
          else if (docName.includes("checkup") || docName.includes("medical"))
            recordType = "Checkup";
          else if (docName.includes("lab") || docName.includes("test"))
            recordType = "Lab Test";
          else if (
            docName.includes("imaging") ||
            docName.includes("x-ray") ||
            docName.includes("mri") ||
            docName.includes("scan")
          )
            recordType = "Imaging";
        }

        await addMedicalRecord({
          personnelId: person.id,
          documentName: doc.name,
          recordType: recordType,
          fileName: doc.name,
          uploadDate: doc.uploadedAt || new Date().toISOString(),
          description: `Synced from personnel documents`,
          category: doc.category || "Medical Record",
        });
        syncOperations.added++;
      }
    }

    console.log("=== SYNC COMPLETE ===");
    console.log("Sync operations:", syncOperations);
    return syncOperations;
  } catch (error) {
    console.error("Error during medical records sync:", error);
    throw error;
  }
}

// Helper to download medical record file
export async function downloadMedicalRecord(recordId) {
  const record = await getMedicalRecord(recordId);
  if (record && record.blobUrl) {
    const link = document.createElement("a");
    link.href = record.blobUrl;
    link.download = record.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(record.blobUrl);
    }, 100);

    return true;
  }
  return false;
}

// ---------------------------
// Session Functions
// ---------------------------

// Set current user in session
export async function setCurrentUser(userData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSION, "readwrite");
    const store = tx.objectStore(STORE_SESSION);
    const session = {
      key: "currentUser",
      value: userData,
      lastUpdated: new Date().toISOString(),
    };
    const req = store.put(session);

    req.onsuccess = () => resolve(userData);
    req.onerror = () => reject(req.error);
  });
}

// Get current user from session
export async function getCurrentUser() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSION, "readonly");
    const store = tx.objectStore(STORE_SESSION);
    const req = store.get("currentUser");

    req.onsuccess = () => {
      const session = req.result;
      resolve(session ? session.value : null);
    };
    req.onerror = () => reject(req.error);
  });
}

// Clear current user session
export async function clearCurrentUser() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSION, "readwrite");
    const store = tx.objectStore(STORE_SESSION);
    const req = store.delete("currentUser");

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
