import BakeryImg from "../../assets/Bakery.png";
import FruitsImg from "../../assets/Fruits.png";
import VeggiesImg from "../../assets/Vegetables.png";
import MeatImg from "../../assets/Meat.png";
import DairyImg from "../../assets/Dairy.png";
import GrainsImg from "../../assets/Grains.png";
import OtherImg from "../../assets/Other.png";

export const FOOD_CATEGORIES = [
  { id: "Fruits", label: "FRUITS", icon: FruitsImg },
  { id: "Vegetables", label: "VEGETABLES", icon: VeggiesImg },
  { id: "Meat", label: "MEAT", icon: MeatImg },
  { id: "Dairy", label: "DAIRY", icon: DairyImg },
  { id: "Bakery", label: "BAKERY", icon: BakeryImg },
  { id: "Grains", label: "GRAINS", icon: GrainsImg },
  { id: "Other", label: "Other", icon: OtherImg },
];

export const UNIT_OPTIONS = ["pcs", "kg", "g", "l", "ml", "pack"];

export const FRACTIONAL_UNITS = new Set(["kg", "l"]);

export const DEFAULT_CATEGORY = "Other";
export const DEFAULT_UNIT = "pcs";

export const EXPIRY_MIN_DAYS_BACK = 14;
