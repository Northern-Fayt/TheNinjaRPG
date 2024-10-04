"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/localstorage";
import NavTabs from "@/layout/NavTabs";
import ItemWithEffects from "@/layout/ItemWithEffects";
import UserSearchSelect from "@/layout/UserSearchSelect";
import BanInfo from "@/layout/BanInfo";
import LoadoutSelector from "@/layout/LoadoutSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getSearchValidator } from "@/validators/register";
import { useRouter } from "next/navigation";
import { useRequiredUserData } from "@/utils/UserContext";
import { useRequireInVillage } from "@/utils/UserContext";
import { api } from "@/utils/api";
import { showMutationToast } from "@/libs/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ContentBox from "@/layout/ContentBox";
import UserRequestSystem from "@/layout/UserRequestSystem";
import Loader from "@/layout/Loader";
import { Swords } from "lucide-react";
import { BATTLE_ARENA_DAILY_LIMIT } from "@/drizzle/constants";
import type { z } from "zod";
import type { GenericObject } from "@/layout/ItemWithEffects";
import { createStatSchema, StatSchemaType } from "@/libs/combat/types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function Arena() {
  // Tab selection
  const [tab, setTab] = useState<"Content" | "Tools" | "Monitoring" | null>(null);

  // Ensure user is in village
  const { userData, access } = useRequireInVillage("/battlearena");

  // Guards
  if (!access) return <Loader explanation="Accessing Battle Arena" />;
  if (!userData) return <Loader explanation="Loading user" />;
  if (userData?.isBanned) return <BanInfo />;

  // Derived values
  const title = tab ?? "";
  var subtitle = "";

  return (
    <>
      <ContentBox
        title={"Content"}
        subtitle={subtitle}
        back_href="/village"
        padding={tab === "Content"}
        topRightContent={
          <NavTabs
            id="toolSelection"
            current={tab}
            options={["Content", "Tools", "Monitoring"]}
            setValue={setTab}
          />
        }
      >
        {tab === "Content" && <div> </div>}
        {tab === "Tools" && <div> </div>}
        {tab === "Monitoring" && (
          <div className="flex flex-col items-center">
            <p className="m-2">
              The arena is a fairly basic circular and raw battleground, where you can
              train your skills as a ninja. Opponent is an invicible training dummy who
              will self destruct. Test and hone your skills for future battles.
            </p>
          </div>
        )}
      </ContentBox>
    </>
  );
}
