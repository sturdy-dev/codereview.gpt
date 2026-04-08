import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT, MIN_VISIBLE_MARGIN, EDGE_MARGIN } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Base class for floating windows with drag, resize, and minimize functionality
 */
export class BaseFloatingWindow {
  constructor(windowId, className = '') {
    this.window = null;
    this.windowId = windowId;
    this.className = className;
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.windowStartX = 0;
    this.windowStartY = 0;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.isMinimized = false;
  }

  /**
   * Create the window DOM element (must be implemented by subclasses)
   */
  createWindowContent() {
    throw new Error('createWindowContent() must be implemented by subclass');
  }

  /**
   * Get the storage key for window state
   */
  getStorageKey() {
    return `${this.windowId}-state`;
  }

  /**
   * Create window structure
   */
  createWindow(initialWidth, initialHeight) {
    // Check if window already exists in DOM (from previous instance)
    let existingWindow = document.getElementById(this.windowId);
    
    if (existingWindow) {
      logger.log(`[CS] Reusing existing window: ${this.windowId}`);
      this.window = existingWindow;
      // Reset any stuck states
      this.window.classList.remove('codereview-minimized');
      this.isMinimized = false;
      return; // Don't recreate, just reuse
    }
    
    logger.log(`[CS] Creating new window: ${this.windowId}`);
    const windowDiv = document.createElement('div');
    windowDiv.id = this.windowId;
    windowDiv.className = `codereview-floating-window ${this.className}`.trim();
    
    const width = Math.min(initialWidth, window.innerWidth * 0.9);
    const height = Math.min(initialHeight, window.innerHeight * 0.9);
    windowDiv.style.width = `${width}px`;
    windowDiv.style.height = `${height}px`;
    
    // Let subclass provide content
    windowDiv.innerHTML = this.createWindowContent();
    
    document.body.appendChild(windowDiv);
    this.window = windowDiv;
    
    this.attachEventListeners();
  }

  /**
   * Attach event listeners for drag, resize, minimize, close
   */
  attachEventListeners() {
    const header = this.window.querySelector('.codereview-window-header');
    const closeBtn = this.window.querySelector('.codereview-close-btn');
    const minimizeBtn = this.window.querySelector('.codereview-minimize-btn');
    const centerBtn = this.window.querySelector('.codereview-center-btn');
    const resizeHandle = this.window.querySelector('.codereview-resize-handle');

    if (!header) return;

    // Drag functionality
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.codereview-window-controls')) return;
      this.startDragging(e);
    });

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Minimize button
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    }
    
    // Center button
    if (centerBtn) {
      centerBtn.addEventListener('click', () => {
        this.centerWindow();
        this.saveState();
      });
    }

    // Resize functionality
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => this.startResizing(e));
    }

    // Global mouse move and up listeners
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.drag(e);
      } else if (this.isResizing) {
        this.resize(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.stopDragging();
      } else if (this.isResizing) {
        this.stopResizing();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.window.style.display !== 'none') {
        this.hide();
      }
    });
  }

  startDragging(e) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    const rect = this.window.getBoundingClientRect();
    this.windowStartX = rect.left;
    this.windowStartY = rect.top;
    this.window.style.cursor = 'grabbing';
  }

  drag(e) {
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    let newX = this.windowStartX + deltaX;
    let newY = this.windowStartY + deltaY;
    
    const rect = this.window.getBoundingClientRect();
    
    // Constrain horizontal movement
    const maxLeft = window.innerWidth - MIN_VISIBLE_MARGIN;
    const minLeft = -rect.width + MIN_VISIBLE_MARGIN;
    newX = Math.max(minLeft, Math.min(newX, maxLeft));
    
    // Constrain vertical movement
    const maxTop = window.innerHeight - 60;
    const minTop = 0;
    newY = Math.max(minTop, Math.min(newY, maxTop));
    
    this.window.style.left = `${newX}px`;
    this.window.style.top = `${newY}px`;
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  }

  stopDragging() {
    this.isDragging = false;
    this.window.style.cursor = '';
    this.saveState();
  }

  startResizing(e) {
    e.stopPropagation();
    this.isResizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    const rect = this.window.getBoundingClientRect();
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;
  }

  resize(e) {
    const deltaX = e.clientX - this.resizeStartX;
    const deltaY = e.clientY - this.resizeStartY;
    const newWidth = Math.max(MIN_WINDOW_WIDTH, this.resizeStartWidth + deltaX);
    const newHeight = Math.max(MIN_WINDOW_HEIGHT, this.resizeStartHeight + deltaY);
    
    this.window.style.width = `${newWidth}px`;
    this.window.style.height = `${newHeight}px`;
  }

  stopResizing() {
    this.isResizing = false;
    this.saveState();
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.window.classList.add('codereview-minimized');
    } else {
      this.window.classList.remove('codereview-minimized');
    }
    this.saveState();
  }

  centerWindow() {
    const width = Math.min(768, window.innerWidth - 40);
    const height = Math.min(768, window.innerHeight - 40);
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    this.window.style.width = `${width}px`;
    this.window.style.height = `${height}px`;
    this.window.style.left = `${left}px`;
    this.window.style.top = `${top}px`;
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  }

  ensureWindowInBounds(rect) {
    // Constrain size to viewport
    let width = Math.max(MIN_WINDOW_WIDTH, Math.min(rect.width, window.innerWidth - EDGE_MARGIN * 2));
    let height = Math.max(MIN_WINDOW_HEIGHT, Math.min(rect.height, window.innerHeight - EDGE_MARGIN * 2));
    
    // Constrain position
    let left = Math.max(EDGE_MARGIN, rect.left);
    let top = Math.max(EDGE_MARGIN, rect.top);
    
    // Don't let window go beyond right edge
    if (left + width > window.innerWidth - EDGE_MARGIN) {
      left = window.innerWidth - width - EDGE_MARGIN;
    }
    
    // Don't let window go beyond bottom edge
    if (top + height > window.innerHeight - EDGE_MARGIN) {
      top = window.innerHeight - height - EDGE_MARGIN;
    }
    
    // Final safety check
    left = Math.max(EDGE_MARGIN, Math.min(left, window.innerWidth - width - EDGE_MARGIN));
    top = Math.max(EDGE_MARGIN, Math.min(top, window.innerHeight - height - EDGE_MARGIN));
    
    return { left, top, width, height };
  }

  show() {
    // Verify window position before showing
    const currentLeft = parseFloat(this.window.style.left) || 0;
    const currentTop = parseFloat(this.window.style.top) || 0;
    const currentWidth = parseFloat(this.window.style.width) || 768;
    const currentHeight = parseFloat(this.window.style.height) || 768;
    
    // Always center if position/size is invalid or default
    if ((currentLeft === 0 && currentTop === 0) || currentWidth < 400 || currentHeight < 300) {
      logger.log(`[CS] Centering window ${this.windowId} - invalid position or size`);
      this.centerWindow();
    } else {
      const safe = this.ensureWindowInBounds({
        left: currentLeft,
        top: currentTop,
        width: currentWidth,
        height: currentHeight
      });
      
      this.window.style.left = `${safe.left}px`;
      this.window.style.top = `${safe.top}px`;
      this.window.style.width = `${safe.width}px`;
      this.window.style.height = `${safe.height}px`;
    }
    
    this.window.style.display = 'flex';
  }

  hide() {
    if (this.window) {
      this.window.style.display = 'none';
      this.saveState();
    }
  }

  /**
   * Completely destroy the window and remove from DOM
   */
  destroy() {
    if (this.window && this.window.parentNode) {
      logger.log(`[CS] Destroying window: ${this.windowId}`);
      this.window.parentNode.removeChild(this.window);
      this.window = null;
    }
  }

  /**
   * Re-append window if it was removed from DOM by page scripts
   */
  ensureInDocument() {
    if (this.window && !document.contains(this.window)) {
      logger.log(`[CS] Window ${this.windowId} was removed, re-appending`);
      document.body.appendChild(this.window);
    }
  }

  /**
   * Check if window exists in DOM
   */
  exists() {
    return this.window && document.getElementById(this.windowId);
  }

  toggle() {
    if (this.window.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  saveState() {
    const rect = this.window.getBoundingClientRect();
    const state = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      isMinimized: this.isMinimized,
      isVisible: this.window.style.display !== 'none'
    };
    localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
  }

  loadState() {
    const stateStr = localStorage.getItem(this.getStorageKey());
    let hasValidState = false;
    
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        
        if (state.left !== undefined && state.top !== undefined && 
            state.width !== undefined && state.height !== undefined &&
            state.width >= 400 && state.height >= 300) {
          
          const safeState = this.ensureWindowInBounds({
            left: state.left,
            top: state.top,
            width: state.width,
            height: state.height
          });
          
          this.window.style.left = `${safeState.left}px`;
          this.window.style.top = `${safeState.top}px`;
          this.window.style.width = `${safeState.width}px`;
          this.window.style.height = `${safeState.height}px`;
          
          hasValidState = true;
          logger.log(`[CS] Loaded window state: ${safeState.width}x${safeState.height} at ${safeState.left},${safeState.top}`);
          
          // Don't restore minimized state - always open fully
          this.isMinimized = false;
          this.window.classList.remove('codereview-minimized');
        }
      } catch (e) {
        console.error('[CS] Failed to load window state:', e);
      }
    }
    
    if (!hasValidState) {
      logger.log(`[CS] No valid state, centering window ${this.windowId}`);
      this.centerWindow();
    }
    
    // Always start hidden
    this.window.style.display = 'none';
  }
}
