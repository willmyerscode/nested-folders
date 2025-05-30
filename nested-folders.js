class NestedFolders {
  static emitEvent(type, detail = {}, elem = document) {
    // Make sure there's an event type
    if (!type) return;

    // Create a new event
    let event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail,
    });

    // Dispatch the event
    return elem.dispatchEvent(event);
  }
  constructor(settings) {
    this.headerFolderItemsNew = document.querySelectorAll(".header-display-desktop .header-nav-folder-item");
    this.headerFolderItems = document.querySelectorAll(".header-display-desktop .header-nav-folder-content a");
    this.headerFoldersTitles = document.querySelectorAll(".header-display-desktop .header-nav-folder-title");
    this.mobileLinks = document.querySelectorAll(".header-menu-nav-list a");
    this.nestedFolders = {};
    this.header = document.querySelector("#header");
    this.settings = settings;
    this.init();
  }

  init() {
    this.getNestedItems();
    this.buildDesktopFolders();
    this.buildMobileFolders();
    this.addAccessibility();

    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      data.parentFolder.addEventListener("mouseenter", () => {
        this.checkFolderPositions();
      });
    }
    this.setActiveNavItem();
    this.removeDash();
    NestedFolders.emitEvent("wmNestedFolders:loaded");
  }

  checkFolderPositions() {
    const isOver = false;
    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      let windowWidth = window.innerWidth;
      let rightEdge = window.innerWidth - window.innerWidth * 0.03;
      let folderRight = data.folder.getBoundingClientRect().right;

      if (rightEdge < folderRight) {
        // If Folder is off the right edge
        data.folder.closest(".header-nav-item--folder").classList.add("folder-side--flipped");

        let folderLeft = data.folder.getBoundingClientRect().left;
        let leftEdge = window.innerWidth * 0.03;
        if (folderLeft < leftEdge) {
          const shrinkFolderBy = window.innerWidth * 0.03 - folderLeft;
          this.header.style.setProperty("--nested-folder-max-width", shrinkFolderBy + "px");
        } else {
          this.header.style.setProperty("--nested-folder-max-width", "initial");
        }

        break;
      } else {
        data.folder.closest(".header-nav-item--folder").classList.remove("folder-side--flipped");
        this.header.style.setProperty("--nested-folder-max-width", "initial");
      }
    }
  }

  getNestedItems() {
    // Get all Dropdown Folders and loop through each
    document.querySelectorAll(".header-display-desktop .header-nav-item--folder .header-nav-folder-content").forEach(item => {
      const items = item.querySelectorAll(".header-nav-folder-item");
      let currentItem = null;

      // Convert to array for easier manipulation
      const itemsArray = Array.from(items);

      // For each item in the dropdown folder
      for (let i = 0; i < itemsArray.length; i++) {
        const item = itemsArray[i];
        const itemText = item.textContent.trim();

        // If current item doesn't have prefix
        if (!itemText.startsWith(this.settings.nestedItemPrefix)) {
          // Check if the next item has a prefix (if it exists)
          const nextItem = i < itemsArray.length - 1 ? itemsArray[i + 1] : null;

          if (nextItem && nextItem.textContent.trim().startsWith(this.settings.nestedItemPrefix)) {
            // This is a parent folder - the next item has a prefix
            const itemLink = item.querySelector("a");
            const itemHref = itemLink ? itemLink.getAttribute("href") : "";
            let id = (itemText.trim() + "-" + itemHref).replace(/\s+/g, "-").replace(/[^a-z0-9\-]/gi, "").toLowerCase();

            // Check for duplicate IDs (same text and URL) and add counter if needed
            let counter = 1;
            let originalId = id;
            while (this.nestedFolders[id]) {
              id = originalId + "-" + counter;
              counter++;
            }

            this.nestedFolders[id] = {
              item: item,
              id: id,
              linkEl: item.querySelector("a"),
              parentFolder: item.closest(".header-nav-item--folder"),
              mobileTrigger: this.findMobileTrigger(item),
              nestedItems: [],
            };
            currentItem = this.nestedFolders[id];
          }
        }
        // If the item has a prefix and we have a current parent item
        else if (currentItem) {
          const desktopLink = item.querySelector("a");
          const href = desktopLink.getAttribute("href");

          // Find all desktop nested items with the same href within folder content
          const allDesktopNestedLinks = document.querySelectorAll(`.header-display-desktop .header-nav-folder-content .header-nav-folder-item a[href="${href}"]`);
          const desktopIndex = Array.from(allDesktopNestedLinks).indexOf(desktopLink);

          // Find all corresponding mobile items with the same href
          const allMobileLinks = document.querySelectorAll(`.header-menu-nav-wrapper .container.header-menu-nav-item a[href="${href}"]`);

          let mobileItemEl = null;
          if (desktopIndex !== -1 && desktopIndex < allMobileLinks.length) {
            mobileItemEl = allMobileLinks[desktopIndex].closest(".header-menu-nav-item");
          } else {
            console.warn(`NestedFolders: Could not find matching mobile element index for nested desktop item "${desktopLink?.innerText?.trim()}". Desktop index: ${desktopIndex}, Mobile elements count: ${allMobileLinks.length}, Href: "${href}".`);
          }

          this.nestedFolders[currentItem.id].nestedItems.push({
            el: item,
            mobileEl: mobileItemEl, // Use the index-matched mobile element
            href: href,
          });
          item.remove();
        }
      }
    });
  }

  // Helper method to find the mobile trigger element
  findMobileTrigger(item) {
    let mobileNestedFolderContainer = null;
    const linkElement = item.querySelector("a");

    if (!linkElement) return null;

    const mobileElements = document.querySelectorAll(`.header-menu-nav-wrapper .container.header-menu-nav-item a[href="${linkElement.getAttribute("href")}"]`);

    if (mobileElements.length === 1) {
      mobileNestedFolderContainer = mobileElements[0].closest(".header-menu-nav-item");
    } else if (mobileElements.length > 1) {
      // Match by index relative to other desktop links with the same href
      const href = linkElement.getAttribute("href");
      const allDesktopLinksWithHref = document.querySelectorAll(`.header-display-desktop .header-nav-list a[href="${href}"]`);
      const desktopHrefIndex = Array.from(allDesktopLinksWithHref).indexOf(linkElement);

      if (desktopHrefIndex !== -1 && desktopHrefIndex < mobileElements.length) {
        mobileNestedFolderContainer = mobileElements[desktopHrefIndex].closest(".header-menu-nav-item");
      } else {
        // Optional: Fallback or error handling
        console.warn(`NestedFolders: Could not find matching mobile element index for desktop item "${linkElement?.innerText?.trim()}". Desktop index: ${desktopHrefIndex}, Mobile elements count: ${mobileElements.length}, Href: "${href}".`);
        // Leaving mobileNestedFolderContainer as null if no match found
      }
    }

    return mobileNestedFolderContainer;
  }

  setActiveNavItem() {
    const links = document.querySelectorAll("#header .header-menu-nav-folder-content a:not([data-action]), #header .header-nav a:not([data-action])");

    links.forEach(link => {
      if (window.location.pathname === link.getAttribute("href")) {
        /* Desktop Nav Folder Level 1 */
        const desktopNestedFolderItem = link.closest(".wm-nested-dropdown");
        if (desktopNestedFolderItem) {
          desktopNestedFolderItem.classList.add("header-nav-item--active");
        }

        /* Desktop Nav Folder Level 2 */
        const desktopNestedFolder = link.closest(".header-nav-item--nested-folder");
        if (desktopNestedFolder) {
          desktopNestedFolder.classList.add("header-nested-nav-folder-item--active");
        }

        /* Desktop Nav Folder Level 3 */
        const desktopNestedLink = link.closest(".nested-folder .header-nav-folder-item");
        if (desktopNestedLink) {
          desktopNestedLink.classList.add("header-nav-folder-item--active");
        }

        /* Mobile Nav Item */
        const headerMenuNavItem = link.closest(".header-menu-nav-item");
        if (headerMenuNavItem) {
          headerMenuNavItem.classList.add("header-menu-nav-item--active");
        }

        /* Mobile Nav Folder */
        const mobileLink = link.closest("[data-folder]");
        if (mobileLink) {
          const href = mobileLink.dataset.folder;
          const navLink = document.querySelector(`.header-menu-nav-item a[data-folder-id="${href}"]`);
          navLink?.parentElement.classList.add("header-menu-nav-item--active");
        }

        link.setAttribute("aria-current", "page");
      }
    });
  }

  removeDash() {
    document.querySelectorAll(".header-nav-item--nested-folder a, .header-menu-nav-item--accordion-folder a").forEach(item => {
      // Find all text nodes within the element
      const walkNode = document.createTreeWalker(item, NodeFilter.SHOW_TEXT, null, false);
      let node;

      while ((node = walkNode.nextNode())) {
        let text = node.nodeValue.trim();
        if (text.startsWith(this.settings.nestedItemPrefix)) {
          text = text.substring(this.settings.nestedItemPrefix.length).trim();
          node.nodeValue = text;
        }
      }
    });
  }

  buildDesktopFolders() {
    function createFolderText(text) {
      //all lowercase, no spaces, no special characters, yes dashes instead of spaces
      return text.toLowerCase().replace(/[^a-z0-9]/g, "-");
    }

    let nestedFolderShouldClickthrough = this.settings.linkNestedFolderOnDesktop;

    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      let trigger = data.item;
      const linkEl = data.item.querySelector("a");
      let parentFolder = data.parentFolder;
      parentFolder.classList.add("wm-nested-dropdown");

      /*Create Desktop Folder*/
      trigger.classList.add("header-nav-item--nested-folder");
      linkEl.setAttribute("aria-label", "nested folder dropdown");
      linkEl.setAttribute("aria-controls", "nested-folder-" + createFolderText(data.item.textContent.trim()));
      linkEl.setAttribute("aria-expanded", "false");

      let nestedFolder = document.createElement("div");
      nestedFolder.classList.add("nested-folder", "header-nav-folder-content");
      nestedFolder.setAttribute("id", "nested-folder-" + createFolderText(data.item.textContent.trim()));

      /*Adding Links To Folders*/
      data.nestedItems.forEach(link => {
        link.el.querySelector("a").innerHTML = '<span class="header-nav-folder-item-content">' + link.el.querySelector("a").innerHTML + "</span>";
        nestedFolder.append(link.el);
      });

      trigger.append(nestedFolder);
      data.folder = nestedFolder;

      //Parent Folder
      if (parentFolder.querySelector(".header-nav-folder-content > .header-nav-item--nested-folder:first-child")) {
        parentFolder.querySelector("a").setAttribute("rel", "nofollow");
      }

      /*Should DesktopFolder Clickthrough?*/
      if (nestedFolderShouldClickthrough) {
        let newUrl = data.nestedItems[0].href;
        data.nestedItems[0].el.classList.add("hidden-link");
        trigger.querySelector("a").setAttribute("href", newUrl);
      } else {
        trigger.querySelector("a").setAttribute("rel", "nofollow");
        trigger.querySelector("a").addEventListener("click", e => {
          e.preventDefault();
        });
      }
    }
  }

  buildMobileFolders() {
    let nestedFolderShouldClickthrough = this.settings.linkNestedFolderOnDesktop;

    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      let mobileTrigger = data.mobileTrigger;

      /*Create Mobile Folder*/
      mobileTrigger.classList.add("header-menu-nav-item--accordion-folder");
      let mobileAccordionContent = document.createElement("div");
      mobileTrigger.querySelector("a").innerHTML += `<span class="icon">${this.settings.mobileIcon}</span>`;
      mobileAccordionContent.classList.add("accordion-folder-content");
      mobileAccordionContent.innerHTML = '<div class="accordion-folder-wrapper"></div>';
      let mobileAccordionWrapper = mobileAccordionContent.querySelector(".accordion-folder-wrapper");

      data.mobileItemsContainer = mobileAccordionContent;

      /*Adding Links To Folders*/
      data.nestedItems.forEach(link => {
        mobileAccordionWrapper.append(link.mobileEl);
        link.mobileEl.innerHTML = link.mobileEl.innerHTML;
      });

      /*Add Mobile Folder*/
      mobileTrigger.append(mobileAccordionContent);
    }

    for (let id in this.nestedFolders) {
      let item = this.nestedFolders[id];
      let mobileTrigger = item.mobileTrigger.querySelector("a");
      let mobileItemsContainer = item.mobileItemsContainer;
      mobileTrigger.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();

        if (mobileItemsContainer.style.maxHeight) {
          mobileTrigger.classList.remove("open");
          mobileItemsContainer.style.maxHeight = null;
        } else {
          mobileTrigger.classList.add("open");
          mobileItemsContainer.style.maxHeight = mobileItemsContainer.scrollHeight + "px";
        }
      });
    }
  }

  addAccessibility() {
    let isUsingKeyboard = false;

    document.addEventListener("keydown", e => {
      if (e.key === "Tab") {
        isUsingKeyboard = true;
      }
    });

    document.addEventListener("mousedown", () => {
      isUsingKeyboard = false;
    });

    document.addEventListener(
      "focus",
      event => {
        for (let item in this.nestedFolders) {
          let data = this.nestedFolders[item];
          data.item.querySelector("a").setAttribute("aria-expanded", "false");
        }
        if (!isUsingKeyboard) return;
        let target = event.target;
        let closestFolder = target.closest(".header-nav-item--nested-folder");
        if (closestFolder || target.getAttribute("aria-label") === "nested folder dropdown") {
          closestFolder.querySelector("a").setAttribute("aria-expanded", "true");
        }
      },
      true
    );
  }
}

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
  const userSettings = window.wmNestedFolderSettings ? window.wmNestedFolderSettings : {};
  const settings = {
    installation: "dashes",
    nestedItemPrefix: "--",
    linkNestedFolderOnDesktop: false,
    mobileIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`,
    mobileCategoryPrepend: "",
    mobileCategoryAppend: "",
    reformatHeaderLinks: false,
  };
  const mergedSettings = deepMerge({}, settings, userSettings);
  const wmNestedFolders = new NestedFolders(mergedSettings);
  window.wmNestedFolders = wmNestedFolders;
  document.body.classList.add("wm-nested-folders-loaded");
})();
