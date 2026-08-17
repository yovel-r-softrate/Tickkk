import { Directive, ElementRef, HostListener, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appResizableColumn]',
  standalone: true
})
export class ResizableColumnDirective implements OnInit {
  @Input('appResizableColumn') columnId!: string;

  private startX!: number;
  private startWidth!: number;
  private resizer!: HTMLElement;
  private documentMouseMoveListener: (() => void) | null = null;
  private documentMouseUpListener: (() => void) | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.createResizer();
    this.loadSavedWidth();
  }

  private createResizer() {
    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    
    this.resizer = this.renderer.createElement('div');
    this.renderer.addClass(this.resizer, 'column-resizer');
    
    // Styling the resizer
    this.renderer.setStyle(this.resizer, 'position', 'absolute');
    this.renderer.setStyle(this.resizer, 'top', '0');
    this.renderer.setStyle(this.resizer, 'right', '0');
    this.renderer.setStyle(this.resizer, 'width', '5px');
    this.renderer.setStyle(this.resizer, 'height', '100%');
    this.renderer.setStyle(this.resizer, 'cursor', 'col-resize');
    this.renderer.setStyle(this.resizer, 'user-select', 'none');
    this.renderer.setStyle(this.resizer, 'z-index', '1');
    
    this.renderer.listen(this.resizer, 'mousedown', this.onMouseDown.bind(this));
    
    this.renderer.appendChild(this.el.nativeElement, this.resizer);
  }

  private loadSavedWidth() {
    if (this.columnId) {
      const savedWidth = localStorage.getItem(`task_table_${this.columnId}_width`);
      if (savedWidth) {
        this.renderer.setStyle(this.el.nativeElement, 'width', savedWidth);
        this.renderer.setStyle(this.el.nativeElement, 'min-width', savedWidth);
        this.renderer.setStyle(this.el.nativeElement, 'max-width', savedWidth);
      }
    }
  }

  private onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.startX = event.clientX;
    this.startWidth = this.el.nativeElement.offsetWidth;

    this.renderer.addClass(this.resizer, 'resizing');

    this.documentMouseMoveListener = this.renderer.listen('document', 'mousemove', this.onMouseMove.bind(this));
    this.documentMouseUpListener = this.renderer.listen('document', 'mouseup', this.onMouseUp.bind(this));
  }

  private onMouseMove(event: MouseEvent) {
    const width = this.startWidth + (event.clientX - this.startX);
    const newWidthStr = `${Math.max(50, width)}px`; // Minimum width 50px
    
    this.renderer.setStyle(this.el.nativeElement, 'width', newWidthStr);
    this.renderer.setStyle(this.el.nativeElement, 'min-width', newWidthStr);
    this.renderer.setStyle(this.el.nativeElement, 'max-width', newWidthStr);
  }

  private onMouseUp() {
    this.renderer.removeClass(this.resizer, 'resizing');

    if (this.columnId) {
      const finalWidth = this.el.nativeElement.style.width;
      localStorage.setItem(`task_table_${this.columnId}_width`, finalWidth);
    }

    if (this.documentMouseMoveListener) {
      this.documentMouseMoveListener();
      this.documentMouseMoveListener = null;
    }
    if (this.documentMouseUpListener) {
      this.documentMouseUpListener();
      this.documentMouseUpListener = null;
    }
  }
}
