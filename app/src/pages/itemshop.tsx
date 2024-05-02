import Shop from "@/layout/Shop";
import Loader from "@/layout/Loader";
import BanInfo from "@/layout/BanInfo";
import { useRequireInVillage } from "@/utils/village";
import type { NextPage } from "next";

const ItemShop: NextPage = () => {
  // Settings
  const { userData, access } = useRequireInVillage("Item shop");

  // Checks
  if (!userData) return <Loader explanation="Loading userdata" />;
  if (!access) return <Loader explanation="Accessing Item Shop" />;
  if (userData.isBanned) return <BanInfo />;

  // Show items for sale with a cost of min 1 ryo
  return (
    <Shop userData={userData} minCost={1} defaultType="WEAPON" back_href={"/village"} />
  );
};

export default ItemShop;
