class NestedFolders {
  constructor(settings) {
    this.headerFolderItems = document.querySelectorAll('.header-display-desktop .header-nav-folder-content a');
    this.headerFoldersTitles = document.querySelectorAll('.header-display-desktop .header-nav-folder-title');
    this.mobileLinks = document.querySelectorAll('.header-menu-nav-list a');
    this.nestedFolders = {};
    this.settings = settings
    this.init();
  }

  init() {
    console.log(this.nestedFolders)
    this.getNestedItems();
    this.buildNestedFolders();
    this.addAccordionClickEvent();
    this.addAccessibility();
    //this.setDesktopFolderClickthrough();
    
    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      let trigger = data.trigger;
      let triggerParent = 
      trigger.addEventListener('mouseenter', () => {
        this.checkFolderPositions()
      })
    }
    document.body.classList.add('wm-nested-folders-loaded')
  }

  checkFolderPositions() {
    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      let windowWidth = window.innerWidth;
      let folderRight = data.folder.getBoundingClientRect().right;
      if (windowWidth < folderRight) {
        data.folder.closest('.header-nav-item--folder').classList.add('folder-side--flipped')
      }
    }
  }

  getNestedItems() {
    
    this.headerFolderItems.forEach(item => {
      let itemHref = item.getAttribute('href');
    
      this.headerFoldersTitles.forEach(title => {
        let titleHref = title.getAttribute('href');
    
        if(itemHref === titleHref) {
          let titleText = title.textContent.trim();
          let folderItems = title.nextElementSibling.querySelectorAll('.header-nav-folder-item a');
          let parentFolder = item.closest('.header-nav-item--folder');
          this.nestedFolders[titleText] = {
            trigger: item, // The DOM element for the folder title
            parentFolder: parentFolder,
            mobileTrigger: document.querySelector(`.header-menu-nav-list a[href="${titleHref}"]:not([data-folder-id])`),
            links: Array.from(folderItems).map(folderItem => ({
              el: folderItem,
              mobileEl: document.querySelector(`.header-menu-nav-list [data-folder="${titleHref}"] [href="${folderItem.getAttribute('href')}"]`),
              text: folderItem.textContent.trim(),
              href: folderItem.getAttribute('href')
            }))
          };
        }
      });
    })
  }

  buildNestedFolders() {      
    let nestedFolderShouldClickthrough = this.settings.linkNestedFolderOnDesktop;
    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      let trigger = data.trigger;
      let triggerParent = trigger.closest('.header-nav-folder-item');
      let mobileTrigger = data.mobileTrigger;
      let mobileTriggerParent = mobileTrigger.closest('.header-menu-nav-item');
      let mobileTriggerParentClone = mobileTriggerParent.cloneNode(true);
      let parentFolder = data.parentFolder;

      /*Create Desktop Folder*/
      triggerParent.classList.add('header-nav-item--nested-folder')
      let nestedFolder = document.createElement('div');
      nestedFolder.classList.add('nested-folder', 'header-nav-folder-content');

      /*Create Mobile Folder*/
      mobileTriggerParent.classList.add('header-menu-nav-item--accordion-folder')
      let mobileAccordionContent = document.createElement('div');
      mobileTrigger.innerHTML += `<span class="icon">${this.settings.mobileIcon}</span>`;
      mobileAccordionContent.classList.add('accordion-folder-content');
      mobileAccordionContent.innerHTML = '<div class="accordion-folder-wrapper"></div>';
      let mobileAccordionWrapper = mobileAccordionContent.querySelector('.accordion-folder-wrapper')

      /*Adding Links To Folders*/
      let desktopFolderToRemove, mobileFolderToRemove, mobileFolderTriggerToRemove;
      for (let i = 0; i < data.links.length; i++) {
        let link = data.links[i];
      
        desktopFolderToRemove = link.el.closest('.header-nav-item--folder');
        link.el.innerText = link.text;
        // Skip the first link if nestedFolderShouldClickthrough is true
        if (!(nestedFolderShouldClickthrough && i === 0)) {
          nestedFolder.append(link.el.parentElement);
        }
      
        mobileFolderToRemove = link.mobileEl.closest('[data-folder]');
        mobileFolderTriggerToRemove = document.querySelector(`[data-folder-id="${mobileTrigger.getAttribute('href')}"]`).closest('.container.header-menu-nav-item');
        mobileAccordionWrapper.append(link.mobileEl.parentElement);
        link.mobileEl.innerHTML = link.text;
      }

      desktopFolderToRemove?.remove();
      mobileFolderToRemove.remove();
      mobileFolderTriggerToRemove.remove();
      
      triggerParent.append(nestedFolder)
      data.folder = nestedFolder
      
      /*Add Mobile Folder*/
      mobileTriggerParent.append(mobileAccordionContent)


      //Parent Folder
      if (parentFolder.querySelector('.header-nav-folder-content > .header-nav-item--nested-folder:first-child')) {
        parentFolder.querySelector('a').setAttribute('rel', 'nofollow');
      }
      
      /*Should DesktopFolder Clickthrough?*/
      if (nestedFolderShouldClickthrough) {
        let newUrl = data.links[0].href;
        console.log(newUrl)
        trigger.setAttribute('href', newUrl)
      } else {
        trigger.setAttribute('rel', 'nofollow');
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
        })
      }
    }
  }
  addAccordionClickEvent() {
    for (let id in this.nestedFolders){
      let item = this.nestedFolders[id];
      let mobileTrigger = item.mobileTrigger;
      mobileTrigger.addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        const content = this.nextElementSibling;
    
        if (content.style.maxHeight) {
          mobileTrigger.classList.remove('open')
          content.style.maxHeight = null;
        } else {
          mobileTrigger.classList.add('open')
          content.style.maxHeight = content.scrollHeight + "px";
        }
    
      });
    }
  }
  addAccessibility() {
    document.addEventListener('focus', function(event) {
      document.querySelectorAll('.header-nav-item--nested-folder.focus').forEach(el => el.classList.remove('focus'));
      let target = event.target;
      let desktopFolder = target.closest('.header-nav-item--nested-folder')
      if (desktopFolder) {
        desktopFolder.classList.add('focus')
      } 
    }, true); 
  }
}

(function() {
  function deepMerge (...objs) {
  	function getType (obj) {
  		return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  	}
  	function mergeObj (clone, obj) {
  		for (let [key, value] of Object.entries(obj)) {
  			let type = getType(value);
  			if (clone[key] !== undefined && getType(clone[key]) === type && ['array', 'object'].includes(type)) {
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
  		if (type === 'array') {
  			clone = [...clone, ...structuredClone(obj)];
  		} else if (type === 'object') {
  			mergeObj(clone, obj);
  		} else {
  			clone = obj;
  		}
  	}
  
  	return clone;
  
  }
  const userSettings = window.wmNestedFolderSettings ? window.wmNestedFolderSettings : {};
  const settings = {
    linkNestedFolderOnDesktop: false,
    mobileIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`,
    mobileCategoryPrepend: '',
    mobileCategoryAppend: '',
  };
  const mergedSettings = deepMerge({}, settings, userSettings);
  const wmNestedFolders = new NestedFolders(mergedSettings);
}())
