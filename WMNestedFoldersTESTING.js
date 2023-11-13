/**
* Testing
* Nested Folders
* Copyright Will-Myers.com
*/

/*this.nestedFolders = {
  "Wander Events": {
    trigger: el,
    mobileTrigger: mobileEl,
    folder: folder,
    links: [{
      el: link,
      mobileEl: mobileEl,
      parent: link.parent,
      text: 'Event 1',
      href: '/events-1'
    }, {
      el: link,
      mobileEl: mobileEl,
      parent: link.parent,
      text: 'Event 2',
      href: '/events-2'
    }, {
      el: link,
      mobileEl: mobileEl,
      parent: link.parent,
      text: 'Event 3',
      href: '/events-3'
    }]
  },
}*/

class NestedFolders {
  constructor() {
    this.userSettings = window.wmNestedFolderSettings || {};
    this.headerLinks = document.querySelectorAll('.header-display-desktop .header-nav-item--folder a');
    this.mobileLinks = document.querySelectorAll('.header-menu-nav-list a');
    this.nestedFolders = {}
    this.settings = {
      mobileIcon: this.userSettings?.mobileIcon || `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`,
      mobileCategoryPrepend: this.userSettings?.mobileCategoryPrepend || '',
      mobileCategoryAppend: this.userSettings?.mobileCategoryAppend || '',
    }
    this.init();
  }

  init() {
    this.getNestedItems();
    this.buildNestedFolders();
    this.addAccordionClickEvent();
    this.addAccessibility();
    
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

    /*Function to Find the Trigger from the subfolders title*/
    const getDesktopTrigger = (folderTitle) => { 
      for (let link of this.headerLinks) {
        if (link.innerText == folderTitle) {
          return link;
        }
      }
    }
    /*Function to Find the Trigger from the subfolders title*/
    const getMobileTrigger = (folderTitle) => { 
      for (let link of this.mobileLinks) {
        if (link.innerText == folderTitle) {
          return link;
        }
      }
    }

    /*Looping Through Desktop Nav Links*/
    for (let link of this.headerLinks){
      let text = link.innerText;
      let textArr = text.split('-');
      
      if (textArr.length == 1) continue;
      let href = link.getAttribute('href');
      let mobileEl = [...document.querySelectorAll(`.header-menu-nav-list [href="${href}"]`)].find(el => el.innerText.trim() === text);
      let folderTitle = textArr[0].trim();
      let subFolderItemText = textArr[1].trim();

      if (this.nestedFolders[folderTitle]) {
          this.nestedFolders[folderTitle].links.push({
            el: link,
            mobileEl: mobileEl,
            parent: link.parentElement,
            text: subFolderItemText,
            href: href
          })
      } else {
        this.nestedFolders[folderTitle] = {
          trigger: getDesktopTrigger(folderTitle),
          mobileTrigger: getMobileTrigger(folderTitle),
          links: [{
            el: link,
            mobileEl: mobileEl,
            parent: link.parentElement,
            text: subFolderItemText,
            href: href
          }]
        }
      }
    }
  }

  buildNestedFolders() {      
    for (let item in this.nestedFolders) {
      let data = this.nestedFolders[item];
      let trigger = data.trigger;
      let triggerParent = trigger.closest('.header-nav-folder-item')
      let mobileTrigger = data.mobileTrigger;
      let mobileTriggerParent = mobileTrigger.closest('.header-menu-nav-item');
      let mobileTriggerParentClone = mobileTriggerParent.cloneNode(true);

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

      /*Adding Desktop Links*/
      for (let link of data.links) {
        nestedFolder.append(link.parent)
        link.el.innerText = link.text;
        
        mobileAccordionWrapper.append(link.mobileEl.parentElement);
        link.mobileEl.innerHTML = link.text;
      }
      mobileTriggerParentClone.querySelector('a').innerHTML = `${this.settings.mobileCategoryPrepend} ${mobileTriggerParentClone.innerText} ${this.settings.mobileCategoryAppend}`
      mobileAccordionWrapper.prepend(mobileTriggerParentClone);
      
      triggerParent.append(nestedFolder)
      data.folder = nestedFolder
      
      /*Add Mobile Folder*/
      mobileTriggerParent.append(mobileAccordionContent)
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


const wmNestedFolders = new NestedFolders;

