import {Coordinate} from './Coordinate';
import {InventoryItemBase} from './InventoryItemBase';

export interface InventoryArea extends InventoryItemBase {
  type: 'area';
  coordinates: Coordinate[];
  holes?: Coordinate[][]; // Inner rings (holes) in the polygon
  area?: number;
  color?: string; // Hex color like "#FF0000" or color name like "green"
}
