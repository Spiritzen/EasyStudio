import { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';

export default function ShadowControl() {
  const { selectedId, canvasInstance } = useCanvasStore();
  const [enabled, setEnabled] = useState(false);
  const [color, setColor] = useState('#000000');
  const [offsetX, setOffsetX] = useState(5);
  const [offsetY, setOffsetY] = useState(5);
  const [blur, setBlur] = useState(10);

  const getObj = (): fabric.Object | null => {
    if (!canvasInstance || !selectedId) return null;
    return canvasInstance.getObjects().find((o) => (o as any).id === selectedId) ?? null;
  };

  useEffect(() => {
    const obj = getObj();
    if (!obj) { setEnabled(false); return; }
    if (obj.shadow) {
      const s = obj.shadow as fabric.Shadow;
      setEnabled(true);
      setColor(s.color || '#000000');
      setOffsetX(s.offsetX || 5);
      setOffsetY(s.offsetY || 5);
      setBlur(s.blur || 10);
    } else {
      setEnabled(false);
    }
  }, [selectedId]);

  const applyShadow = (updates?: Partial<{ color: string; offsetX: number; offsetY: number; blur: number }>) => {
    const obj = getObj();
    if (!obj || !canvasInstance) return;
    const shadow = {
      color: updates?.color ?? color,
      offsetX: updates?.offsetX ?? offsetX,
      offsetY: updates?.offsetY ?? offsetY,
      blur: updates?.blur ?? blur,
    };
    obj.set('shadow', new fabric.Shadow(shadow));
    canvasInstance.renderAll();
  };

  const removeShadow = () => {
    const obj = getObj();
    if (!obj || !canvasInstance) return;
    obj.set('shadow', null);
    canvasInstance.renderAll();
    setEnabled(false);
  };

  const toggle = () => {
    if (enabled) { removeShadow(); } else { setEnabled(true); applyShadow(); }
  };

  return (
    <div className="shadow-control">
      <div className="shadow-header">
        <span style={{ fontSize: 11, color: '#8b8ba7' }}>Ombre</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={toggle} />
          <span className="toggle-slider" />
        </label>
      </div>
      {enabled && (
        <div className="shadow-fields">
          <div className="fill-row">
            <span>Couleur</span>
            <input type="color" value={color}
              onChange={(e) => { setColor(e.target.value); applyShadow({ color: e.target.value }); }} />
          </div>
          <div className="fill-row">
            <span>Déc X</span>
            <input type="number" value={offsetX} style={{ width: 60 }}
              onChange={(e) => { setOffsetX(+e.target.value); applyShadow({ offsetX: +e.target.value }); }} />
          </div>
          <div className="fill-row">
            <span>Déc Y</span>
            <input type="number" value={offsetY} style={{ width: 60 }}
              onChange={(e) => { setOffsetY(+e.target.value); applyShadow({ offsetY: +e.target.value }); }} />
          </div>
          <div className="fill-row">
            <span>Flou</span>
            <input type="range" min={0} max={50} value={blur}
              onChange={(e) => { setBlur(+e.target.value); applyShadow({ blur: +e.target.value }); }} />
            <span>{blur}px</span>
          </div>
        </div>
      )}
    </div>
  );
}
