import {Coordinate} from './Coordinate';
import {InventoryItemBase} from './InventoryItemBase';

export interface InventoryArea extends InventoryItemBase {
  type: 'area';
  coordinates: Coordinate[];
  area?: number;
  color?: string; // Hex color like "#FF0000" or color name like "green"
}
