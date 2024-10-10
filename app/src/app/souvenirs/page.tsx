"use client";

import Shop from "@/layout/Shop";
import Loader from "@/layout/Loader";
import BanInfo from "@/layout/BanInfo";
import { IMG_BUILDING_SOUVENIER } from "@/drizzle/constants";
import { useRequireInVillage } from "@/utils/UserContext";

export default function ItemShop() {
  // Settings
  const { userData, access } = useRequireInVillage("/souvenirs");

  // Checks
  if (!userData) return <Loader explanation="Loading userdata" />;
  if (!access) return <Loader explanation="Accessing Souvenirs Shop" />;
  if (userData.isBanned) return <BanInfo />;

  // Show items for sale with a cost of min 1 ryo
  return (
    <Shop
      title="Souvenirs Shop"
      userData={userData}
      minCost={1}
      image={IMG_BUILDING_SOUVENIER}
      defaultType="WEAPON"
      back_href={"/village"}
      eventItems={true}
    />
  );
}
