class NestedFolders {
  static emitEvent(type, detail = {}, elem = document) {
    if (!type) return;
    let event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail,
    });
    return elem.dispatchEvent(event);
  }

  constructor(settings) {
    this.header = document.querySelector("#header");
    this.settings = settings;
    this.desktopNestedFolders = [];
    this.mobileNestedFolders = [];
    this.init();
  }

  init() {
    this.processDesktopFolders();
    this.processMobileFolders();
    this.addAccessibility();
    this.setActiveNavItem();
    this.removeDashPrefix();
    NestedFolders.emitEvent("wmNestedFolders:loaded");
  }

  /**
   * Process Desktop Navigation
   * Finds items with the prefix (--) and groups them under parent items
   */
  processDesktopFolders() {
    const desktopFolderContents = document.querySelectorAll(
      ".header-display-desktop .header-nav-item--folder .header-nav-folder-content"
    );

    desktopFolderContents.forEach((folderContent, folderIndex) => {
      const folderItems = Array.from(folderContent.querySelectorAll(".header-nav-folder-item"));
      const parentFolder = folderContent.closest(".header-nav-item--folder");
      
      let currentParentItem = null;
      const itemsToRemove = [];

      for (let i = 0; i < folderItems.length; i++) {
        const item = folderItems[i];
        const itemText = item.textContent.trim();

        // Check if this item has the nested prefix
        const hasPrefix = itemText.startsWith(this.settings.nestedItemPrefix);
        
        // Check if next item has prefix (indicates current item is a parent)
        const nextItem = folderItems[i + 1];
        const nextHasPrefix = nextItem && nextItem.textContent.trim().startsWith(this.settings.nestedItemPrefix);

        if (!hasPrefix && nextHasPrefix) {
          // This item is a parent folder trigger
          const uniqueId = this.generateUniqueId(itemText, folderIndex, i);
          
          currentParentItem = {
            id: uniqueId,
            item: item,
            linkEl: item.querySelector("a"),
            parentFolder: parentFolder,
            nestedItems: [],
            folderElement: null,
          };
          
          this.desktopNestedFolders.push(currentParentItem);
          
        } else if (hasPrefix && currentParentItem) {
          // This is a nested item - add it to current parent
          currentParentItem.nestedItems.push({
            element: item,
            linkEl: item.querySelector("a"),
          });
          itemsToRemove.push(item);
        } else if (!hasPrefix && !nextHasPrefix) {
          // Regular item, not a parent
          currentParentItem = null;
        }
      }

      // Remove nested items from original location
      itemsToRemove.forEach(item => item.remove());
    });

    // Build all desktop nested folders after collection
    this.desktopNestedFolders.forEach(folderData => {
      this.buildDesktopNestedFolder(folderData);
    });

    // Add position checking on hover for each nested folder
    this.desktopNestedFolders.forEach(folderData => {
      const nestedFolderTrigger = folderData.item;
      
      nestedFolderTrigger.addEventListener("mouseenter", () => {
        // Use requestAnimationFrame to ensure the folder is visible before checking position
        requestAnimationFrame(() => {
          this.checkFolderPosition(folderData);
        });
      });
      
      nestedFolderTrigger.addEventListener("mouseleave", () => {
        // Reset when leaving
        folderData.parentFolder.classList.remove("folder-side--flipped");
        this.header.style.setProperty("--nested-folder-max-width", "initial");
      });
    });
  }

  /**
   * Build the nested folder structure for desktop
   */
  buildDesktopNestedFolder(folderData) {
    const trigger = folderData.item;
    const linkEl = folderData.linkEl;
    const parentFolder = folderData.parentFolder;
    
    // Mark parent folder
    parentFolder.classList.add("wm-nested-dropdown");
    
    // Setup trigger item
    trigger.classList.add("header-nav-item--nested-folder");
    linkEl.setAttribute("aria-label", "nested folder dropdown");
    linkEl.setAttribute("aria-controls", folderData.id);
    linkEl.setAttribute("aria-expanded", "false");

    // Create nested folder container
    const nestedFolder = document.createElement("div");
    nestedFolder.classList.add("nested-folder", "header-nav-folder-content");
    nestedFolder.setAttribute("id", folderData.id);

    // Add nested items to folder
    folderData.nestedItems.forEach(nestedItem => {
      const link = nestedItem.linkEl;
      if (link && !link.querySelector(".header-nav-folder-item-content")) {
        link.innerHTML = `<span class="header-nav-folder-item-content">${link.innerHTML}</span>`;
      }
      nestedFolder.appendChild(nestedItem.element);
    });

    // Append folder to trigger
    trigger.appendChild(nestedFolder);
    folderData.folderElement = nestedFolder;

    // Handle clickthrough behavior
    if (this.settings.linkNestedFolderOnDesktop && folderData.nestedItems.length > 0) {
      const firstItemHref = folderData.nestedItems[0].linkEl?.getAttribute("href");
      if (firstItemHref) {
        linkEl.setAttribute("href", firstItemHref);
        folderData.nestedItems[0].element.classList.add("hidden-link");
      }
    } else {
      linkEl.setAttribute("rel", "nofollow");
      linkEl.addEventListener("click", (e) => {
        e.preventDefault();
      });
    }

    // If first child is nested folder, mark parent button
    if (parentFolder.querySelector(".header-nav-folder-content > .header-nav-item--nested-folder:first-child")) {
      const parentButton = parentFolder.querySelector("button.header-nav-folder-title");
      if (parentButton) {
        parentButton.setAttribute("rel", "nofollow");
      }
    }
  }

  /**
   * Process Mobile Navigation
   * Completely independent from desktop - processes mobile menu structure
   */
  processMobileFolders() {
    const mobileFolders = document.querySelectorAll(".header-menu-nav-folder[data-folder]");

    mobileFolders.forEach((mobileFolder, folderIndex) => {
      const folderContent = mobileFolder.querySelector(".header-menu-nav-folder-content");
      if (!folderContent) return;

      // Get the folder ID from data-folder attribute
      const folderId = mobileFolder.getAttribute("data-folder");
      
      // Find all items in this mobile folder (excluding controls)
      const folderItems = Array.from(
        folderContent.querySelectorAll(".header-menu-nav-item:not(.header-menu-controls)")
      );

      let currentParentItem = null;
      const itemsToRemove = [];

      for (let i = 0; i < folderItems.length; i++) {
        const item = folderItems[i];
        const itemText = item.textContent.trim();

        // Check if this item has the nested prefix
        const hasPrefix = itemText.startsWith(this.settings.nestedItemPrefix);
        
        // Check if next item has prefix (indicates current item is a parent)
        const nextItem = folderItems[i + 1];
        const nextHasPrefix = nextItem && nextItem.textContent.trim().startsWith(this.settings.nestedItemPrefix);

        if (!hasPrefix && nextHasPrefix) {
          // This item is a parent folder trigger
          const uniqueId = this.generateUniqueId(itemText, folderIndex, i, "mobile");
          
          currentParentItem = {
            id: uniqueId,
              item: item,
              linkEl: item.querySelector("a"),
            folderId: folderId,
              nestedItems: [],
            accordionContent: null,
          };
          
          this.mobileNestedFolders.push(currentParentItem);
          
        } else if (hasPrefix && currentParentItem) {
          // This is a nested item - add it to current parent
          currentParentItem.nestedItems.push({
            element: item,
            linkEl: item.querySelector("a"),
          });
          itemsToRemove.push(item);
        } else if (!hasPrefix && !nextHasPrefix) {
          // Regular item, not a parent
          currentParentItem = null;
        }
      }

      // Remove nested items from original location
      itemsToRemove.forEach(item => item.remove());
    });

    // Build all mobile nested folders after collection
    this.mobileNestedFolders.forEach(folderData => {
      this.buildMobileNestedFolder(folderData);
    });
  }

  /**
   * Build the accordion structure for mobile
   */
  buildMobileNestedFolder(folderData) {
    const trigger = folderData.item;
    const linkEl = folderData.linkEl;
    
    // Mark as accordion folder
    trigger.classList.add("header-menu-nav-item--accordion-folder");
    
    // Add icon to link
    if (linkEl && !linkEl.querySelector(".icon")) {
      linkEl.innerHTML += `<span class="icon">${this.settings.mobileIcon}</span>`;
    }

    // Create accordion content
    const accordionContent = document.createElement("div");
    accordionContent.classList.add("accordion-folder-content");
    
    const accordionWrapper = document.createElement("div");
    accordionWrapper.classList.add("accordion-folder-wrapper");
    
    // Add nested items to accordion
    folderData.nestedItems.forEach(nestedItem => {
      accordionWrapper.appendChild(nestedItem.element);
    });

    accordionContent.appendChild(accordionWrapper);
    trigger.appendChild(accordionContent);
    folderData.accordionContent = accordionContent;

    // Setup click handler for accordion
    if (linkEl) {
      linkEl.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();

        const isOpen = accordionContent.style.maxHeight;
        
        if (isOpen) {
          linkEl.classList.remove("open");
          accordionContent.style.maxHeight = null;
      } else {
          linkEl.classList.add("open");
          accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        }
      });
    }
  }

  /**
   * Check if a specific desktop folder is positioned off-screen and adjust
   */
  checkFolderPosition(folderData) {
    if (!folderData.folderElement) return;

    // Reset first
    folderData.parentFolder.classList.remove("folder-side--flipped");
    this.header.style.setProperty("--nested-folder-max-width", "initial");

    // Wait a tick to ensure the folder is visible and rendered
    const rightEdge = window.innerWidth - window.innerWidth * 0.03;
    const folderRect = folderData.folderElement.getBoundingClientRect();
    const folderRight = folderRect.right;

    if (rightEdge < folderRight) {
      // Folder is off the right edge - flip it
      folderData.parentFolder.classList.add("folder-side--flipped");

      // Check position again after flipping
      requestAnimationFrame(() => {
        const flippedRect = folderData.folderElement.getBoundingClientRect();
        const folderLeft = flippedRect.left;
        const leftEdge = window.innerWidth * 0.03;
        
        if (folderLeft < leftEdge) {
          // Also off the left edge after flipping - shrink it
          const shrinkBy = leftEdge - folderLeft;
          this.header.style.setProperty("--nested-folder-max-width", `calc(100% - ${shrinkBy}px)`);
        }
      });
    }
  }

  /**
   * Generate a unique ID for folders
   */
  generateUniqueId(text, folderIndex, itemIndex, prefix = "desktop") {
    const cleanText = text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    
    return `${prefix}-nested-folder-${folderIndex}-${itemIndex}-${cleanText}`;
  }

  /**
   * Remove the prefix (--) from nested item text
   */
  removeDashPrefix() {
    const elements = document.querySelectorAll(
      ".header-nav-item--nested-folder a, .header-menu-nav-item--accordion-folder a"
    );

    elements.forEach(element => {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue.trim();
        if (text.startsWith(this.settings.nestedItemPrefix)) {
          const newText = text.substring(this.settings.nestedItemPrefix.length).trim();
          node.nodeValue = text.replace(text.trim(), newText);
        }
      }
    });
  }

  /**
   * Set active navigation item classes based on current URL
   */
  setActiveNavItem() {
    const links = document.querySelectorAll(
      "#header .header-menu-nav-folder-content a:not([data-action]), #header .header-nav a:not([data-action])"
    );

    const currentPath = window.location.pathname;

    links.forEach(link => {
      const linkHref = link.getAttribute("href");
      
      if (currentPath === linkHref) {
        // Desktop: Mark parent folder
        const desktopParentFolder = link.closest(".wm-nested-dropdown");
        if (desktopParentFolder) {
          desktopParentFolder.classList.add("header-nav-item--active");
        }

        // Desktop: Mark nested folder item (level 2)
        const desktopNestedFolder = link.closest(".header-nav-item--nested-folder");
        if (desktopNestedFolder) {
          desktopNestedFolder.classList.add("header-nested-nav-folder-item--active");
        }

        // Desktop: Mark nested link (level 3)
        const desktopNestedLink = link.closest(".nested-folder .header-nav-folder-item");
        if (desktopNestedLink) {
          desktopNestedLink.classList.add("header-nav-folder-item--active");
        }

        // Mobile: Mark nav item
        const mobileNavItem = link.closest(".header-menu-nav-item");
        if (mobileNavItem) {
          mobileNavItem.classList.add("header-menu-nav-item--active");
        }

        // Mobile: Mark parent folder
        const mobileFolder = link.closest("[data-folder]");
        if (mobileFolder) {
          const folderId = mobileFolder.dataset.folder;
          const folderTrigger = document.querySelector(
            `.header-menu-nav-item a[data-folder-id="${folderId}"]`
          );
          if (folderTrigger) {
            folderTrigger.closest(".header-menu-nav-item")?.classList.add("header-menu-nav-item--active");
          }
        }

        // Set aria-current
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /**
   * Add keyboard accessibility for nested folders
   */
  addAccessibility() {
    let isUsingKeyboard = false;

    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        isUsingKeyboard = true;
      }
    });

    document.addEventListener("mousedown", () => {
      isUsingKeyboard = false;
    });

    document.addEventListener(
      "focus",
      (event) => {
        // Reset all aria-expanded
        this.desktopNestedFolders.forEach(folderData => {
          if (folderData.linkEl) {
            folderData.linkEl.setAttribute("aria-expanded", "false");
          }
        });

        if (!isUsingKeyboard) return;

        const target = event.target;
        const closestFolder = target.closest(".header-nav-item--nested-folder");
        
        if (closestFolder) {
          const folderLink = closestFolder.querySelector("a");
          if (folderLink) {
            folderLink.setAttribute("aria-expanded", "true");
            
            // Check folder position for keyboard navigation
            const folderData = this.desktopNestedFolders.find(data => data.item === closestFolder);
            if (folderData) {
              requestAnimationFrame(() => {
                this.checkFolderPosition(folderData);
              });
            }
          }
        } else if (target.getAttribute("aria-label") === "nested folder dropdown") {
          target.setAttribute("aria-expanded", "true");
          
          // Check folder position for keyboard navigation
          const closestNestedFolder = target.closest(".header-nav-item--nested-folder");
          if (closestNestedFolder) {
            const folderData = this.desktopNestedFolders.find(data => data.item === closestNestedFolder);
            if (folderData) {
              requestAnimationFrame(() => {
                this.checkFolderPosition(folderData);
              });
            }
          }
        }
      },
      true
    );
  }
}

// Initialize
(function () {
  function deepMerge(...objs) {
    function getType(obj) {
      return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    }
    
    function mergeObj(clone, obj) {
      for (let [key, value] of Object.entries(obj)) {
        let type = getType(value);
        if (clone[key] !== undefined && getType(clone[key]) === type && ["array", "object"].includes(type)) {
          clone[key] = deepMerge(clone[key], value);
        } else {
          clone[key] = structuredClone(value);
        }
      }
    }
    
    let clone = structuredClone(objs.shift());
    for (let obj of objs) {
      let type = getType(obj);
      if (getType(clone) !== type) {
        clone = structuredClone(obj);
        continue;
      }
      if (type === "array") {
        clone = [...clone, ...structuredClone(obj)];
      } else if (type === "object") {
        mergeObj(clone, obj);
      } else {
        clone = obj;
      }
    }

    return clone;
  }

  const userSettings = window.wmNestedFolderSettings || {};
  const defaultSettings = {
    installation: "dashes",
    nestedItemPrefix: "--",
    linkNestedFolderOnDesktop: false,
    mobileIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`,
  };

  const mergedSettings = deepMerge({}, defaultSettings, userSettings);
  const wmNestedFolders = new NestedFolders(mergedSettings);
  
  window.wmNestedFolders = wmNestedFolders;
  document.body.classList.add("wm-nested-folders-loaded");
})();
