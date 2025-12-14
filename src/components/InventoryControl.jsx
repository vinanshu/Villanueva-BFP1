// Inventory.jsx
import React, { useEffect, useState, useRef } from "react";
import styles from "./InventoryControl.module.css";
import { Html5QrcodeScanner } from "html5-qrcode";
import Sidebar from "./Sidebar.jsx";
import Hamburger from "./Hamburger.jsx";
import { useSidebar } from "./SidebarContext.jsx";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Title, Meta } from "react-head";
import { supabase } from "../lib/supabaseClient";
import jsbarcode from 'jsbarcode';

export default function InventoryControl() {
  // data
  const [inventory, setInventory] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const { isSidebarCollapsed } = useSidebar();
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentFilterCard, setCurrentFilterCard] = useState("total");
  const [showScanner, setShowScanner] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState(null);
  const qrScannerRef = useRef(null);

  // add form controlled fields
  const emptyNew = {
    itemName: "",
    itemCode: "",
    category: "",
    status: "",
    assignedTo: "",
    purchaseDate: "",
    lastChecked: "",
  };
  const [newItem, setNewItem] = useState(emptyNew);

  // State to track floating labels for add sidebar
  const [floatingLabels, setFloatingLabels] = useState({
    category: false,
    status: false,
    assignedTo: false,
  });

  // State to track floating labels for edit modal
  const [editFloatingLabels, setEditFloatingLabels] = useState({
    category: false,
    status: false,
    assignedTo: false,
  });

  // edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editItem, setEditItem] = useState(emptyNew);

  // delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // add sidebar state
  const [isAddSidebarOpen, setIsAddSidebarOpen] = useState(false);

  // Summary numbers (computed)
  const totalItems = inventory.length;
  const assignedItems = inventory.filter(
    (i) => i.assigned_to && i.assigned_to !== "Unassigned"
  ).length;
  const storageItems = inventory.filter(
    (i) => !i.assigned_to || i.assigned_to === "Unassigned"
  ).length;

  // Load inventory & personnel from Supabase
  async function loadInventory() {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInventory(data || []);
      
      const totalPages = Math.max(1, Math.ceil((data || []).length / rowsPerPage));
      if (currentPage > totalPages) setCurrentPage(totalPages);
    } catch (err) {
      console.error("loadInventory error", err);
    }
  }

  async function loadPersonnel() {
    try {
      const { data, error } = await supabase
        .from("personnel")
        .select("id, first_name, last_name, badge_number")
        .order("last_name", { ascending: true });

      if (error) throw error;
      setPersonnel(data || []);
    } catch (err) {
      console.error("loadPersonnel error", err);
    }
  }

  useEffect(() => {
    loadInventory();
    loadPersonnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for select changes in add sidebar
  const handleAddSelectChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
    setFloatingLabels((prev) => ({ ...prev, [field]: value !== "" }));
  };

  // Handler for select changes in edit modal
  const handleEditSelectChange = (field, value) => {
    setEditItem((prev) => ({ ...prev, [field]: value }));
    setEditFloatingLabels((prev) => ({ ...prev, [field]: value !== "" }));
  };

  // Filtering & pagination logic
  function applyFilters(items) {
    let filtered = [...items];
    if (currentFilterCard === "assigned") {
      filtered = filtered.filter(
        (i) => i.assigned_to && i.assigned_to !== "Unassigned"
      );
    } else if (currentFilterCard === "storage") {
      filtered = filtered.filter(
        (i) => !i.assigned_to || i.assigned_to === "Unassigned"
      );
    }

    const s = search.trim().toLowerCase();
    const cat = filterCategory.trim().toLowerCase();
    const stat = filterStatus.trim().toLowerCase();

    filtered = filtered.filter((i) => {
      const text =
        `${i.item_name} ${i.item_code} ${i.category} ${i.status} ${i.assigned_to} ${i.purchase_date} ${i.last_checked}`.toLowerCase();
      const catMatch = !cat || (i.category || "").toLowerCase().includes(cat);
      const statMatch = !stat || (i.status || "").toLowerCase().includes(stat);
      const searchMatch = !s || text.includes(s);
      return catMatch && statMatch && searchMatch;
    });

    return filtered;
  }

  const filteredInventory = applyFilters(inventory);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredInventory.length / rowsPerPage)
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginated = filteredInventory.slice(pageStart, pageStart + rowsPerPage);

  const renderPaginationButtons = () => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredInventory.length / rowsPerPage)
    );
    const hasNoData = filteredInventory.length === 0;

    const buttons = [];

    buttons.push(
      <button
        key="prev"
        className={`${styles.inventoryPaginationBtn} ${
          hasNoData ? styles.inventoryDisabled : ""
        }`}
        disabled={currentPage === 1 || hasNoData}
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
      >
        Previous
      </button>
    );

    buttons.push(
      <button
        key={1}
        className={`${styles.inventoryPaginationBtn} ${
          1 === currentPage ? styles.inventoryActive : ""
        } ${hasNoData ? styles.inventoryDisabled : ""}`}
        onClick={() => setCurrentPage(1)}
        disabled={hasNoData}
      >
        1
      </button>
    );

    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className={styles.inventoryPaginationEllipsis}>
          ...
        </span>
      );
    }

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(pageCount - 1, currentPage + 1);

    if (currentPage <= 3) {
      endPage = Math.min(pageCount - 1, 4);
    }

    if (currentPage >= pageCount - 2) {
      startPage = Math.max(2, pageCount - 3);
    }

    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < pageCount) {
        buttons.push(
          <button
            key={i}
            className={`${styles.inventoryPaginationBtn} ${
              i === currentPage ? styles.inventoryActive : ""
            } ${hasNoData ? styles.inventoryDisabled : ""}`}
            onClick={() => setCurrentPage(i)}
            disabled={hasNoData}
          >
            {i}
          </button>
        );
      }
    }

    if (currentPage < pageCount - 2) {
      buttons.push(
        <span key="ellipsis2" className={styles.inventoryPaginationEllipsis}>
          ...
        </span>
      );
    }

    if (pageCount > 1) {
      buttons.push(
        <button
          key={pageCount}
          className={`${styles.inventoryPaginationBtn} ${
            pageCount === currentPage ? styles.inventoryActive : ""
          } ${hasNoData ? styles.inventoryDisabled : ""}`}
          onClick={() => setCurrentPage(pageCount)}
          disabled={hasNoData}
        >
          {pageCount}
        </button>
      );
    }

    buttons.push(
      <button
        key="next"
        className={`${styles.inventoryPaginationBtn} ${
          hasNoData ? styles.inventoryDisabled : ""
        }`}
        disabled={currentPage === pageCount || hasNoData}
        onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
      >
        Next
      </button>
    );

    return buttons;
  };

  // Generate barcode image - FIXED VERSION
  const generateBarcodeImage = (itemCode, itemName, equipmentDetails = null) => {
    return new Promise((resolve, reject) => {
      try {
        // Create a container div
        const container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '250px';
        container.style.padding = '20px';
        container.style.backgroundColor = 'white';
        container.style.boxSizing = 'border-box';
        container.style.fontFamily = 'Arial, sans-serif';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'BFP Villanueva - Equipment Barcode';
        title.style.margin = '0 0 15px 0';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        title.style.color = '#2b2b2b';
        title.style.textAlign = 'center';
        container.appendChild(title);
        
        // Add equipment details
        const detailsDiv = document.createElement('div');
        detailsDiv.style.marginBottom = '15px';
        detailsDiv.style.fontSize = '12px';
        
        let detailsHTML = `
          <div><strong>Equipment:</strong> ${itemName}</div>
          <div><strong>Barcode:</strong> ${itemCode}</div>
        `;
        
        if (equipmentDetails) {
          detailsHTML += `
            <div><strong>Category:</strong> ${equipmentDetails.category || 'N/A'}</div>
            <div><strong>Status:</strong> ${equipmentDetails.status || 'N/A'}</div>
            <div><strong>Assigned To:</strong> ${equipmentDetails.assigned_to || 'Unassigned'}</div>
          `;
        }
        
        detailsDiv.innerHTML = detailsHTML;
        container.appendChild(detailsDiv);
        
        // Create canvas for barcode
        const canvas = document.createElement('canvas');
        canvas.width = 350;
        canvas.height = 80;
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        
        try {
          // Generate barcode on canvas
          jsbarcode(canvas, itemCode, {
            format: "CODE128",
            displayValue: true,
            fontSize: 14,
            textMargin: 5,
            margin: 5,
            width: 2,
            height: 50,
            background: "#ffffff"
          });
          
          // Append canvas to container
          container.appendChild(canvas);
          
          // Add footer
          const footer = document.createElement('div');
          footer.textContent = `Generated: ${new Date().toLocaleDateString()}`;
          footer.style.fontSize = '10px';
          footer.style.color = '#666';
          footer.style.textAlign = 'center';
          footer.style.marginTop = '10px';
          container.appendChild(footer);
          
          // Create a temporary image element
          const tempImg = new Image();
          tempImg.onload = () => {
            // Create final canvas
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = 400;
            finalCanvas.height = 250;
            const ctx = finalCanvas.getContext('2d');
            
            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 250);
            
            // Draw the container content
            // Since we can't directly draw HTML, we'll draw simplified version
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('BFP Villanueva - Equipment Barcode', 20, 30);
            
            ctx.font = '12px Arial';
            ctx.fillText(`Equipment: ${itemName}`, 20, 60);
            ctx.fillText(`Barcode: ${itemCode}`, 20, 80);
            
            if (equipmentDetails) {
              ctx.fillText(`Category: ${equipmentDetails.category || 'N/A'}`, 20, 100);
              ctx.fillText(`Status: ${equipmentDetails.status || 'N/A'}`, 20, 120);
              ctx.fillText(`Assigned To: ${equipmentDetails.assigned_to || 'Unassigned'}`, 20, 140);
            }
            
            // Draw barcode
            const barcodeCanvas = document.createElement('canvas');
            barcodeCanvas.width = 350;
            barcodeCanvas.height = 80;
            
            jsbarcode(barcodeCanvas, itemCode, {
              format: "CODE128",
              displayValue: true,
              fontSize: 14,
              textMargin: 5,
              margin: 5,
              width: 2,
              height: 50
            });
            
            ctx.drawImage(barcodeCanvas, 25, 150);
            
            // Draw footer
            ctx.font = '10px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 20, 240);
            
            // Convert to data URL
            const dataUrl = finalCanvas.toDataURL('image/png');
            resolve(dataUrl);
          };
          
          tempImg.src = canvas.toDataURL('image/png');
          
        } catch (barcodeError) {
          console.error('Barcode generation error:', barcodeError);
          reject(barcodeError);
        }
        
      } catch (error) {
        console.error('Error in generateBarcodeImage:', error);
        reject(error);
      }
    });
  };

  // Simple barcode generation (just the barcode)
  const generateSimpleBarcode = (itemCode) => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 100;
        
        jsbarcode(canvas, itemCode, {
          format: "CODE128",
          displayValue: true,
          fontSize: 16,
          textMargin: 10,
          margin: 10,
          width: 2,
          height: 70
        });
        
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    });
  };

  // Handlers
  function openAddSidebar() {
    setIsAddSidebarOpen(true);
    loadPersonnel();
    setFloatingLabels({
      category: false,
      status: false,
      assignedTo: false,
    });
  }

  function closeAddSidebar() {
    setIsAddSidebarOpen(false);
    setNewItem(emptyNew);
    setFloatingLabels({
      category: false,
      status: false,
      assignedTo: false,
    });
  }

  async function handleAddSubmit(e) {
  e.preventDefault();
  try {
    // Generate simple barcode image
    let barcodeImage = null;
    if (newItem.itemCode) {
      barcodeImage = await generateSimpleBarcode(newItem.itemCode);
    }

    // Prepare data for Supabase - handle dates properly
    const inventoryData = {
      item_name: newItem.itemName,
      item_code: newItem.itemCode,
      category: newItem.category,
      status: newItem.status,
      assigned_to: newItem.assignedTo,
      // Convert empty strings to null for dates
      purchase_date: newItem.purchaseDate?.trim() ? newItem.purchaseDate : null,
      last_checked: newItem.lastChecked?.trim() ? newItem.lastChecked : null,
      barcode_image: barcodeImage,
    };

    console.log("Submitting data:", inventoryData); // Debug log

    // Insert into Supabase
    const { data, error } = await supabase
      .from("inventory")
      .insert([inventoryData])
      .select()
      .single();

    if (error) {
      console.error("Insert error details:", error);
      
      // More detailed error handling
      if (error.code === '23514') {
        alert(`Date validation error: ${error.message}\n\nPlease ensure:\n1. Purchase date is valid or empty\n2. Last checked date is valid or empty\n3. Dates are in YYYY-MM-DD format`);
      } else if (error.code === '42501') {
        alert("Permission denied. Please disable RLS on the inventory table.");
      } else {
        throw error;
      }
      return;
    }

    await loadInventory();
    closeAddSidebar();
  } catch (err) {
    console.error("add error", err);
    alert("Error adding item: " + err.message);
  }
}

  function openEditModal(item) {
    setEditId(item.id);
    const editData = {
      itemName: item.item_name || "",
      itemCode: item.item_code || "",
      category: item.category || "",
      status: item.status || "",
      assignedTo: item.assigned_to || "Unassigned",
      purchaseDate: item.purchase_date || "",
      lastChecked: item.last_checked || "",
    };
    setEditItem(editData);

    setEditFloatingLabels({
      category: !!editData.category,
      status: !!editData.status,
      assignedTo: !!editData.assignedTo,
    });

    loadPersonnel();
    setIsEditOpen(true);
  }

  function closeEditModal() {
    setIsEditOpen(false);
    setEditId(null);
    setEditItem(emptyNew);
    setEditFloatingLabels({
      category: false,
      status: false,
      assignedTo: false,
    });
  }

 async function handleEditSubmit(e) {
  e.preventDefault();
  if (!editId) return;

  try {
    // Generate simple barcode image if item code changed
    let barcodeImage = null;
    const existingItem = inventory.find(item => item.id === editId);
    if (editItem.itemCode !== existingItem.item_code) {
      barcodeImage = await generateSimpleBarcode(editItem.itemCode);
    }

    // Prepare updated data with proper date handling
    const updatedData = {
      item_name: editItem.itemName,
      item_code: editItem.itemCode,
      category: editItem.category,
      status: editItem.status,
      assigned_to: editItem.assignedTo,
      // Convert empty strings to null for dates
      purchase_date: editItem.purchaseDate?.trim() ? editItem.purchaseDate : null,
      last_checked: editItem.lastChecked?.trim() ? editItem.lastChecked : null,
      updated_at: new Date().toISOString(),
    };

    // Add barcode image if generated
    if (barcodeImage) {
      updatedData.barcode_image = barcodeImage;
    }

    console.log("Updating data:", updatedData); // Debug log

    // Update in Supabase
    const { data, error } = await supabase
      .from("inventory")
      .update(updatedData)
      .eq("id", editId)
      .select()
      .single();

    if (error) {
      console.error("Update error details:", error);
      
      if (error.code === '23514') {
        alert(`Date validation error: ${error.message}\n\nPlease check date formats and values.`);
      }
      throw error;
    }

    await loadInventory();
    closeEditModal();
  } catch (err) {
    console.error("edit error", err);
    alert("Error updating item: " + err.message);
  }
}

  function confirmDelete(id) {
    setDeleteId(id);
    setIsDeleteOpen(true);
  }

  function cancelDelete() {
    setDeleteId(null);
    setIsDeleteOpen(false);
  }

  async function performDelete() {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      await loadInventory();
      cancelDelete();
    } catch (err) {
      console.error("delete error", err);
      alert("Error deleting item: " + err.message);
    }
  }

  function handleCardClick(filter) {
    if (currentFilterCard === filter) {
      setCurrentFilterCard("total");
    } else {
      setCurrentFilterCard(filter);
    }
    setCurrentPage(1);
  }

  const startScanner = async () => {
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
      });

      stream.getTracks().forEach((track) => track.stop());

      const permissionRequest = document.getElementById(
        styles.inventoryCameraPermissionRequest
      );
      const qrReader = document.getElementById(styles.inventoryQrReader);

      if (permissionRequest && qrReader) {
        if (permissionRequest) permissionRequest.style.display = "none";
        if (qrReader) qrReader.style.display = "block";
      }

      if (
        document.getElementById(styles.inventoryQrReader) &&
        !qrScannerRef.current?.html5QrcodeScanner
      ) {
        qrScannerRef.current = {
          html5QrcodeScanner: new Html5QrcodeScanner(
            styles.inventoryQrReader,
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
            },
            false
          ),
        };

        qrScannerRef.current.html5QrcodeScanner.render(
          async (decodedText) => {
            console.log("Scanned barcode:", decodedText);
            
            try {
              const { data, error } = await supabase
                .from("inventory")
                .select("*")
                .eq("item_code", decodedText)
                .single();
              
              if (error && error.code !== 'PGRST116') throw error;
              
              if (data) {
                alert(`✅ Equipment Found!\n\n` +
                      `Equipment Name: ${data.item_name || 'N/A'}\n` +
                      `Category: ${data.category || 'N/A'}\n` +
                      `Status: ${data.status || 'N/A'}\n` +
                      `Assigned To: ${data.assigned_to || 'Unassigned'}\n` +
                      `Purchase Date: ${formatDate(data.purchase_date) || 'N/A'}\n` +
                      `Last Checked: ${formatDate(data.last_checked) || 'N/A'}\n\n` +
                      `Details have been filled in the form.`);
                
                if (isAddSidebarOpen) {
                  setNewItem({
                    itemName: data.item_name || "",
                    itemCode: data.item_code || "",
                    category: data.category || "",
                    status: data.status || "",
                    assignedTo: data.assigned_to || "Unassigned",
                    purchaseDate: data.purchase_date || "",
                    lastChecked: data.last_checked || "",
                  });
                  
                  setFloatingLabels({
                    category: !!data.category,
                    status: !!data.status,
                    assignedTo: !!data.assignedTo,
                  });
                } else if (isEditOpen) {
                  setEditItem({
                    itemName: data.item_name || "",
                    itemCode: data.item_code || "",
                    category: data.category || "",
                    status: data.status || "",
                    assignedTo: data.assigned_to || "Unassigned",
                    purchaseDate: data.purchase_date || "",
                    lastChecked: data.last_checked || "",
                  });
                  
                  setEditFloatingLabels({
                    category: !!data.category,
                    status: !!data.status,
                    assignedTo: !!data.assignedTo,
                  });
                }
              } else {
                if (isAddSidebarOpen) {
                  setNewItem(prev => ({ ...prev, itemCode: decodedText }));
                } else if (isEditOpen) {
                  setEditItem(prev => ({ ...prev, itemCode: decodedText }));
                }
                alert("No existing equipment found with this barcode. Please enter details manually.");
              }
            } catch (err) {
              console.error("Error fetching equipment:", err);
              if (isAddSidebarOpen) {
                setNewItem(prev => ({ ...prev, itemCode: decodedText }));
              } else if (isEditOpen) {
                setEditItem(prev => ({ ...prev, itemCode: decodedText }));
              }
              alert("Scanned barcode: " + decodedText + "\n\nEnter equipment details manually.");
            }
            
            stopScanner();
          },
          (errorMessage) => {
            if (
              !errorMessage.includes("NotFoundException") &&
              !errorMessage.includes("No MultiFormat Readers")
            ) {
              console.log("Scan status:", errorMessage);
            }
          }
        );
      }
    } catch (error) {
      console.error("Camera permission denied:", error);
      handleCameraError(error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Robust date formatting function
  const formatDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return "";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.warn("Date formatting error:", error);
      return dateString;
    }
  };

  const handleCameraError = (error) => {
    const permissionRequest = document.getElementById(
      styles.inventoryCameraPermissionRequest
    );
    if (permissionRequest) {
      permissionRequest.innerHTML = `
      <div class="${styles.inventoryPermissionIcon}">❌</div>
      <h4>Camera Access Denied</h4>
      <p>Unable to access camera. Please ensure you've granted camera permissions and that no other app is using the camera.</p>
      <div class="${styles.inventoryPermissionTroubleshoot}">
        <p><strong>To fix this:</strong></p>
        <ul>
          <li>Check browser permissions</li>
          <li>Ensure no other app is using the camera</li>
          <li>Try refreshing the page</li>
        </ul>
      </div>
      <button class="${styles.inventoryRequestPermissionBtn} ${styles.inventoryRetryBtn}" onclick="window.location.reload()">
        Retry Camera Access
      </button> 
    `;
      permissionRequest.style.display = "block";
    }
  };

  const stopScanner = () => {
    if (qrScannerRef.current?.html5QrcodeScanner) {
      try {
        qrScannerRef.current.html5QrcodeScanner.clear().catch((error) => {
          console.error("Failed to clear scanner:", error);
        });
        qrScannerRef.current.html5QrcodeScanner = null;
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setShowScanner(false);
  };

  // Show barcode modal with equipment details
  const showBarcode = async (itemCode, itemName) => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("item_code", itemCode)
        .single();
      
      if (error) throw error;
      
      setSelectedBarcode({ 
        code: itemCode, 
        name: itemName,
        details: data
      });
      setShowBarcodeModal(true);
    } catch (err) {
      console.error("Error fetching item details:", err);
      setSelectedBarcode({ 
        code: itemCode, 
        name: itemName,
        details: null
      });
      setShowBarcodeModal(true);
    }
  };

  // Download barcode with equipment details - FIXED VERSION
  const downloadBarcode = async (itemCode, itemName) => {
    try {
      // Fetch equipment details
      let equipmentDetails = null;
      try {
        const { data } = await supabase
          .from("inventory")
          .select("*")
          .eq("item_code", itemCode)
          .single();
        equipmentDetails = data;
      } catch (err) {
        console.log("Could not fetch equipment details:", err);
      }
      
      // Generate barcode image
      const barcodeImage = await generateBarcodeImage(itemCode, itemName, equipmentDetails);
      
      if (barcodeImage) {
        // Create download link
        const link = document.createElement('a');
        link.href = barcodeImage;
        link.download = `BFP_Equipment_${itemCode.replace(/[^a-z0-9]/gi, '_')}.png`;
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Barcode downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading barcode:', error);
      
      // Fallback: Try simple barcode
      try {
        const simpleBarcode = await generateSimpleBarcode(itemCode);
        const link = document.createElement('a');
        link.href = simpleBarcode;
        link.download = `BFP_Barcode_${itemCode.replace(/[^a-z0-9]/gi, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error('Fallback barcode generation failed:', fallbackError);
        alert('Error downloading barcode. Please try again.');
      }
    }
  };

  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Initialize barcode canvas when modal opens
  useEffect(() => {
    if (showBarcodeModal && selectedBarcode) {
      const canvas = document.getElementById('barcode-canvas');
      if (canvas) {
        // Clear previous barcode
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Generate new barcode
        jsbarcode(canvas, selectedBarcode.code, {
          format: "CODE128",
          displayValue: true,
          fontSize: 16,
          textMargin: 10,
          margin: 10,
          width: 2,
          height: 70
        });
      }
    }
  }, [showBarcodeModal, selectedBarcode]);

  return (
    <div className={styles.inventoryAppContainer}>
      <Title>Inventory Control | BFP Villanueva</Title>
      <Meta name="robots" content="noindex, nofollow" />

      <Hamburger />
      <Sidebar />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <h1>Inventory Control</h1>
        <div className={styles.inventoryTopControls}>
          <button
            id={styles.inventoryAddEquipmentBtn}
            className={styles.inventoryAddBtn}
            onClick={openAddSidebar}
          >
            + Add Equipment
          </button>

          <div className={styles.inventoryTableHeader}>
            <select
              className={styles.inventoryFilterCategory}
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              <option>Firefighting Equipment</option>
              <option>Protective Gear</option>
              <option>Vehicle Equipment</option>
            </select>

            <select
              className={styles.inventoryFilterStatus}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option>Good</option>
              <option>Needs Maintenance</option>
              <option>Damaged</option>
            </select>

            <input
              type="text"
              className={styles.inventorySearchBar}
              placeholder="🔍 Search equipment..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <div
          id={styles.inventorySummary}
          style={{ display: "flex", gap: 20, margin: 20 }}
        >
          <button
            className={`${styles.inventorySummaryCard} ${
              styles.inventoryTotal
            } ${currentFilterCard === "total" ? styles.inventoryActive : ""}`}
            data-filter="total"
            onClick={() => handleCardClick("total")}
          >
            <h3>Total Items</h3>
            <p id={styles.inventoryTotalItems}>{totalItems}</p>
          </button>
          <button
            className={`${styles.inventorySummaryCard} ${
              styles.inventoryAssigned
            } ${
              currentFilterCard === "assigned" ? styles.inventoryActive : ""
            }`}
            data-filter="assigned"
            onClick={() => handleCardClick("assigned")}
          >
            <h3>Assigned</h3>
            <p id={styles.inventoryAssignedItems}>{assignedItems}</p>
          </button>
          <button
            className={`${styles.inventorySummaryCard} ${
              styles.inventoryStorage
            } ${currentFilterCard === "storage" ? styles.inventoryActive : ""}`}
            data-filter="storage"
            onClick={() => handleCardClick("storage")}
          >
            <h3>In Storage</h3>
            <p id={styles.inventoryStorageItems}>{storageItems}</p>
          </button>
        </div>
        {isAddSidebarOpen && (
          <div
            className={styles.inventoryRightSidebarOverlay}
            onClick={closeAddSidebar}
          >
            <div
              className={styles.inventoryRightSidebar}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.inventorySidebarHeader}>
                <h3>Add New Equipment</h3>
                <button
                  className={styles.inventoryCloseBtn}
                  onClick={closeAddSidebar}
                >
                  &times;
                </button>
              </div>
              <form
                className={styles.inventorySidebarForm}
                onSubmit={handleAddSubmit}
              >
                <div className={styles.inventoryFormSection}>
                  <h3>Equipment Details</h3>

                  <div className={styles.inventoryInputGroup}>
                    <input
                      id={styles.inventoryAddItemName}
                      type="text"
                      required
                      value={newItem.itemName}
                      onChange={(e) =>
                        setNewItem((s) => ({ ...s, itemName: e.target.value }))
                      }
                      placeholder=" "
                    />
                    <h4>Equipment Name</h4>
                  </div>

                  <div className={styles.inventoryInputGroup}>
                    <div className={styles.inventoryBarcodeGrid}>
                      <input
                        id={styles.inventoryAddItemCode}
                        type="text"
                        required
                        value={newItem.itemCode}
                        onChange={(e) =>
                          setNewItem((s) => ({
                            ...s,
                            itemCode: e.target.value,
                          }))
                        }
                        placeholder=""
                      />
                      <h4>Barcode</h4>
                      <button
                        type="button"
                        className={styles.inventoryQrScannerBtn}
                        onClick={() => {
                          setShowScanner(true);
                          startScanner();
                        }}
                      >
                        📷 Scan
                      </button>
                    </div>
                  </div>
                  <div className={styles.inventoryInputGroup}>
                    <select
                      id={styles.inventoryAddCategory}
                      required
                      value={newItem.category}
                      onChange={(e) =>
                        handleAddSelectChange("category", e.target.value)
                      }
                      className={floatingLabels.category ? styles.floating : ""}
                    >
                      <option value="" disabled hidden></option>
                      <option value="Firefighting Equipment">
                        Firefighting Equipment
                      </option>
                      <option value="Protective Gear">Protective Gear</option>
                      <option value="Vehicle Equipment">
                        Vehicle Equipment
                      </option>
                    </select>
                    <h4>Select Category</h4>
                  </div>
                </div>

                <div className={styles.inventoryFormSection}>
                  <h3>Status & Assignment</h3>

                  <div className={styles.inventoryInputGroup}>
                    <select
                      id={styles.inventoryAddStatus}
                      required
                      value={newItem.status}
                      onChange={(e) =>
                        handleAddSelectChange("status", e.target.value)
                      }
                      className={floatingLabels.status ? styles.floating : ""}
                    >
                      <option value="" disabled hidden></option>
                      <option value="Good">Good</option>
                      <option value="Needs Maintenance">
                        Needs Maintenance
                      </option>
                      <option value="Damaged">Damaged</option>
                    </select>
                    <h4>Status</h4>
                  </div>

                  <div className={styles.inventoryInputGroup}>
                    <select
                      id={styles.inventoryAddAssignedTo}
                      required
                      value={newItem.assignedTo}
                      onChange={(e) =>
                        handleAddSelectChange("assignedTo", e.target.value)
                      }
                      className={
                        floatingLabels.assignedTo ? styles.floating : ""
                      }
                    >
                      <option value="" disabled hidden></option>
                      <option value="Unassigned">Unassigned</option>
                      {personnel.map((person) => (
                        <option
                          key={person.id}
                          value={`${person.first_name} ${person.last_name}`}
                        >
                          {person.first_name} {person.last_name} 
                          {person.badge_number ? ` (${person.badge_number})` : ''}
                        </option>
                      ))}
                    </select>
                    <h4>Assign to Personnel</h4>
                  </div>
                </div>

                <div className={styles.inventoryFormSection}>
                  <h3>Dates</h3>

                  <div className={styles.inventoryInputGroup}>
                    <Flatpickr
                      id={styles.inventoryAddPurchaseDate}
                      type="date"
                      required
                      value={newItem.purchaseDate}
                      onChange={(dates) => {
                        if (dates && dates[0]) {
                          const dateStr = dates[0].toISOString().split("T")[0];
                          setNewItem((s) => ({ ...s, purchaseDate: dateStr }));
                        }
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      placeholder=" "
                    />
                    <h4>Purchase Date</h4>
                  </div>

                  <div className={styles.inventoryInputGroup}>
                    <Flatpickr
                      id={styles.inventoryAddLastChecked}
                      type="date"
                      required
                      value={newItem.lastChecked}
                      onChange={(dates) => {
                        if (dates && dates[0]) {
                          const dateStr = dates[0].toISOString().split("T")[0];
                          setNewItem((s) => ({ ...s, lastChecked: dateStr }));
                        }
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        maxDate: "today",
                      }}
                      placeholder=" "
                    />
                    <h4>Last Checked</h4>
                  </div>
                </div>

                <div className={styles.inventorySidebarActions}>
                  <button type="submit" className={styles.inventorySubmitBtn}>
                    Add Equipment
                  </button>
                  <button
                    className={styles.inventoryCancelBtn}
                    type="button"
                    onClick={closeAddSidebar}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Table */}
        <div
          id={styles.inventoryTableContainer}
          className={styles.inventoryTableContainer}
        >
          <div
            className={`${styles.inventoryPaginationContainer} ${styles.inventoryTopPagination}`}
          >
            {renderPaginationButtons()}
          </div>

          <table className={styles.inventoryTable}>
            <thead>
              <tr>
                <th>Equipment Name</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Purchase Date</th>
                <th>Last Checked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id={styles.inventoryTableBody}>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      🛠️
                    </div>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#2b2b2b",
                        marginBottom: "8px",
                      }}
                    >
                      No Equipment Found
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#999",
                      }}
                    >
                      Ready to serve but no equipment in inventory yet
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_name}</td>
                    <td>
                      <div className={styles.barcodeCell}>
                        <span className={styles.barcodeText}>{item.item_code}</span>
                        <button 
                          className={styles.barcodeViewBtn}
                          onClick={() => showBarcode(item.item_code, item.item_name)}
                        >
                          📄 View Barcode
                        </button>
                        <button 
                          className={styles.barcodeDownloadBtn}
                          onClick={() => downloadBarcode(item.item_code, item.item_name)}
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.status}</td>
                    <td>{item.assigned_to}</td>
                    <td>{formatDate(item.purchase_date)}</td>
                    <td>{formatDate(item.last_checked)}</td>
                    <td>
                      <button
                        className={styles.inventoryEditBtn}
                        onClick={() => openEditModal(item)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className={styles.inventoryDeleteBtn}
                        onClick={() => confirmDelete(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isDeleteOpen && (
          <div
            className={styles.inventoryModalDeleteOverlay}
            style={{ display: "flex" }}
            onClick={(e) => {
              if (
                e.target.className.includes(styles.inventoryModalDeleteOverlay)
              )
                cancelDelete();
            }}
          >
            <div
              className={styles.inventoryModalDeleteContent}
              style={{ maxWidth: "450px" }}
            >
              <div className={styles.inventoryModalDeleteHeader}>
                <h2 style={{ marginLeft: "30px" }}>Confirm Deletion</h2>
                <span
                  className={styles.inventoryModalDeleteCloseBtn}
                  onClick={cancelDelete}
                >
                  &times;
                </span>
              </div>

              <div className={styles.inventoryModalDeleteBody}>
                <div className={styles.inventoryDeleteConfirmationContent}>
                  <div className={styles.inventoryDeleteWarningIcon}>⚠️</div>
                  <p className={styles.inventoryDeleteConfirmationText}>
                    Are you sure you want to delete the inventory item
                  </p>
                  <p className={styles.inventoryDocumentNameHighlight}>
                    "
                    {inventory.find((item) => item.id === deleteId)?.item_name ||
                      "this item"}
                    "?
                  </p>
                  <p className={styles.inventoryDeleteWarning}>
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className={styles.inventoryModalDeleteActions}>
                <button
                  className={`${styles.inventoryModalDeleteBtn} ${styles.inventoryModalCancelBtn}`}
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.inventoryModalDeleteBtn} ${styles.inventoryDeleteConfirmBtn}`}
                  onClick={performDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditOpen && (
          <div
            id={styles.inventoryEditModal}
            className={styles.inventoryModalOverlay}
            style={{ display: "flex" }}
            onClick={(e) => {
              if (e.target.id === styles.inventoryEditModal) closeEditModal();
            }}
          >
            <div className={styles.inventoryModalContainer}>
              <div className={styles.inventoryModalHeader}>
                <h3 className={styles.inventoryModalTitle}>Edit Equipment</h3>
                <button
                  className={styles.inventoryModalCloseBtn}
                  onClick={closeEditModal}
                >
                  &times;
                </button>
              </div>

              <form
                id={styles.inventoryEditEquipmentForm}
                className={styles.inventoryModalForm}
                onSubmit={handleEditSubmit}
              >
                <div className={styles.inventoryModalSection}>
                  <h3 className={styles.inventoryModalSectionTitle}>
                    Equipment Details
                  </h3>

                  <div className={styles.inventoryModalInputRow}>
                    <div
                      className={`${styles.inventoryModalInputGroup} ${styles.fullWidth}`}
                    >
                      <input
                        id={styles.inventoryEditItemName}
                        type="text"
                        required
                        value={editItem.itemName}
                        onChange={(e) =>
                          setEditItem((s) => ({
                            ...s,
                            itemName: e.target.value,
                          }))
                        }
                        placeholder=" "
                        className={styles.inventoryModalInput}
                      />
                      <h4 className={styles.inventoryModalInputLabel}>
                        Equipment Name
                      </h4>
                    </div>

                    <div className={styles.inventoryModalBarcodeGroup}>
                      <div className={styles.inventoryModalBarcodeContainer}>
                        <input
                          id={styles.inventoryEditItemCode}
                          type="text"
                          required
                          value={editItem.itemCode}
                          onChange={(e) =>
                            setEditItem((s) => ({
                              ...s,
                              itemCode: e.target.value,
                            }))
                          }
                          placeholder=" "
                          className={styles.inventoryModalInput}
                        />
                        <h4 className={styles.inventoryModalInputLabelBarCode}>
                          Barcode
                        </h4>
                        <button
                          type="button"
                          className={styles.inventoryModalScanBtn}
                          onClick={() => {
                            setShowScanner(true);
                            startScanner();
                          }}
                        >
                          📷 Scan
                        </button>
                      </div>
                    </div>

                    <div className={styles.inventoryModalInputGroup}>
                      <select
                        id={styles.inventoryEditCategory}
                        required
                        value={editItem.category}
                        onChange={(e) =>
                          handleEditSelectChange("category", e.target.value)
                        }
                        className={`${styles.inventoryModalSelect} ${
                          editFloatingLabels.category ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Select Category
                        </option>
                        <option value="Firefighting Equipment">
                          Firefighting Equipment
                        </option>
                        <option value="Protective Gear">Protective Gear</option>
                        <option value="Vehicle Equipment">
                          Vehicle Equipment
                        </option>
                      </select>
                      <h4 className={styles.inventoryModalInputLabel}>
                        Category
                      </h4>
                    </div>

                    <div className={styles.inventoryModalInputGroup}>
                      <select
                        id={styles.inventoryEditStatus}
                        required
                        value={editItem.status}
                        onChange={(e) =>
                          handleEditSelectChange("status", e.target.value)
                        }
                        className={`${styles.inventoryModalSelect} ${
                          editFloatingLabels.status ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Select Status
                        </option>
                        <option value="Good">Good</option>
                        <option value="Needs Maintenance">
                          Needs Maintenance
                        </option>
                        <option value="Damaged">Damaged</option>
                      </select>
                      <h4 className={styles.inventoryModalInputLabel}>
                        Status
                      </h4>
                    </div>
                  </div>
                </div>

                <div className={styles.inventoryModalSection}>
                  <h3 className={styles.inventoryModalSectionTitle}>
                    Assignment
                  </h3>

                  <div className={styles.inventoryModalInputRow}>
                    <div
                      className={`${styles.inventoryModalInputGroup} ${styles.fullWidth}`}
                    >
                      <select
                        id={styles.inventoryEditAssignedTo}
                        required
                        value={editItem.assignedTo}
                        onChange={(e) =>
                          handleEditSelectChange("assignedTo", e.target.value)
                        }
                        className={`${styles.inventoryModalSelect} ${
                          editFloatingLabels.assignedTo ? styles.floating : ""
                        }`}
                      >
                        <option value="" disabled hidden>
                          Assign to Personnel
                        </option>
                        <option value="Unassigned">Unassigned</option>
                        {personnel.map((person) => (
                          <option
                            key={person.id}
                            value={`${person.first_name} ${person.last_name}`}
                          >
                            {person.first_name} {person.last_name}
                            {person.badge_number ? ` (${person.badge_number})` : ''}
                          </option>
                        ))}
                      </select>
                      <h4 className={styles.inventoryModalInputLabel}>
                        Assign to Personnel
                      </h4>
                    </div>
                  </div>
                </div>

                <div className={styles.inventoryModalSection}>
                  <h3 className={styles.inventoryModalSectionTitle}>Dates</h3>

                  <div className={styles.inventoryModalInputRow}>
                    <div className={styles.inventoryModalInputGroup}>
                      <Flatpickr
                        id={styles.inventoryEditPurchaseDate}
                        type="date"
                        required
                        value={editItem.purchaseDate}
                        onChange={(dates) => {
                          if (dates && dates[0]) {
                            const dateStr = dates[0]
                              .toISOString()
                              .split("T")[0];
                            setEditItem((s) => ({
                              ...s,
                              purchaseDate: dateStr,
                            }));
                          }
                        }}
                        options={{
                          dateFormat: "Y-m-d",
                          maxDate: "today",
                        }}
                        placeholder=" "
                        className={styles.inventoryModalInput}
                      />
                      <h4 className={styles.inventoryModalInputLabel}>
                        Purchase Date
                      </h4>
                    </div>

                    <div className={styles.inventoryModalInputGroup}>
                      <Flatpickr
                        id={styles.inventoryEditLastChecked}
                        type="date"
                        required
                        value={editItem.lastChecked}
                        onChange={(dates) => {
                          if (dates && dates[0]) {
                            const dateStr = dates[0]
                              .toISOString()
                              .split("T")[0];
                            setEditItem((s) => ({
                              ...s,
                              lastChecked: dateStr,
                            }));
                          }
                        }}
                        options={{
                          dateFormat: "Y-m-d",
                          maxDate: "today",
                        }}
                        placeholder=" "
                        className={styles.inventoryModalInput}
                      />
                      <h4 className={styles.inventoryModalInputLabel}>
                        Last Checked
                      </h4>
                    </div>
                  </div>
                </div>

                <div className={styles.inventoryModalActions}>
                  <button
                    type="submit"
                    className={styles.inventoryModalSubmitBtn}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className={styles.inventoryModalCancelBtn}
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Scanner Modal */}
        {showScanner && (
          <div
            className={styles.inventoryQrScannerModalOverlay}
            onClick={stopScanner}
          >
            <div
              className={styles.inventoryQrScannerModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.inventoryQrScannerHeader}>
                <h3>Scan Barcode</h3>
                <button
                  className={styles.inventoryCloseBtn}
                  onClick={stopScanner}
                >
                  &times;
                </button>
              </div>
              <div className={styles.inventoryQrScannerContent}>
                <div
                  className={styles.inventoryCameraPermissionRequest}
                  id={styles.inventoryCameraPermissionRequest}
                >
                  <div className={styles.inventoryPermissionIcon}>📷</div>
                  <h4>Camera Access Required</h4>
                  <p>
                    To scan barcodes, we need access to your camera. Please
                    allow camera permissions when prompted.
                  </p>
                  <button
                    className={`${styles.inventoryRequestPermissionBtn} ${
                      isRequestingPermission ? styles.inventoryLoading : ""
                    }`}
                    onClick={startScanner}
                    disabled={isRequestingPermission}
                  >
                    {isRequestingPermission
                      ? "Requesting..."
                      : "Allow Camera Access"}
                  </button>
                </div>

                <div
                  id={styles.inventoryQrReader}
                  className={styles.inventoryQrReader}
                  style={{ display: "none" }}
                ></div>

                <p className={styles.inventoryQrScannerHint}>
                  Point camera at barcode to scan automatically
                </p>
                <div className={styles.inventoryQrScannerActions}>
                  <button
                    className={styles.inventoryCancelScanBtn}
                    onClick={stopScanner}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Display Modal */}
        {showBarcodeModal && selectedBarcode && (
          <div className={styles.barcodeModalOverlay} onClick={() => setShowBarcodeModal(false)}>
            <div className={styles.barcodeModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.barcodeModalHeader}>
                <h3>Equipment Barcode</h3>
                <button 
                  className={styles.barcodeModalClose}
                  onClick={() => setShowBarcodeModal(false)}
                >
                  &times;
                </button>
              </div>
              <div className={styles.barcodeModalContent}>
                <div className={styles.barcodeContainer}>
                  <div className={styles.barcodeInfo}>
                    <h4>{selectedBarcode.name}</h4>
                    <p><strong>Barcode:</strong> {selectedBarcode.code}</p>
                    
                    {selectedBarcode.details && (
                      <div className={styles.equipmentDetails}>
                        <p><strong>Category:</strong> {selectedBarcode.details.category}</p>
                        <p><strong>Status:</strong> {selectedBarcode.details.status}</p>
                        <p><strong>Assigned To:</strong> {selectedBarcode.details.assigned_to || 'Unassigned'}</p>
                        <p><strong>Purchase Date:</strong> {formatDate(selectedBarcode.details.purchase_date)}</p>
                        <p><strong>Last Checked:</strong> {formatDate(selectedBarcode.details.last_checked)}</p>
                      </div>
                    )}
                  </div>
                  <canvas 
                    id="barcode-canvas" 
                    width="300"
                    height="100"
                    style={{ marginTop: '20px' }}
                  />
                </div>
                <div className={styles.barcodeModalActions}>
                  <button 
                    className={styles.barcodeDownloadBtn}
                    onClick={() => downloadBarcode(selectedBarcode.code, selectedBarcode.name)}
                  >
                    ⬇️ Download Barcode
                  </button>
                  <button 
                    className={styles.barcodeCloseBtn}
                    onClick={() => setShowBarcodeModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}