import { useState } from "react";
import { useSafePush } from "@/utils/routing";
import ContentBox from "@/layout/ContentBox";
import SelectField from "@/layout/SelectField";
import Loader from "@/layout/Loader";
import MassEditContent from "@/layout/MassEditContent";
import ItemWithEffects from "@/layout/ItemWithEffects";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";
import { FilePlus, SquarePen } from "lucide-react";
import { QuestTypes, type QuestType } from "@/drizzle/constants";
import { canChangeContent } from "@/utils/permissions";
import { useUserData } from "@/utils/UserContext";
import { show_toast } from "@/libs/toast";
import { useInfinitePagination } from "@/libs/pagination";
import type { NextPage } from "next";

const ManualTravel: NextPage = () => {
  // Settings
  const { data: userData } = useUserData();
  const [lastElement, setLastElement] = useState<HTMLDivElement | null>(null);

  // Router for forwarding
  const router = useSafePush();

  // State
  const [questType, setQuestType] = useState<QuestType>(QuestTypes[0]);

  // Query data
  const {
    data: quests,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = api.quests.getAll.useInfiniteQuery(
    { limit: 20, questType: questType },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      keepPreviousData: true,
    },
  );
  const allQuests = quests?.pages.map((page) => page.data).flat();
  useInfinitePagination({ fetchNextPage, hasNextPage, lastElement });

  // Mutations
  const { mutate: create, isLoading: load1 } = api.quests.create.useMutation({
    onSuccess: async (data) => {
      await refetch();
      await router.push(`/cpanel/quest/edit/${data.message}`);
      show_toast("Created Quest", "Placeholder Quest Created", "success");
    },
    onError: (error) => {
      show_toast("Error creating", error.message, "error");
    },
  });

  const { mutate: remove, isLoading: load2 } = api.quests.delete.useMutation({
    onSuccess: async () => {
      await refetch();
      show_toast("Deleted Quest", "Quest Deleted", "success");
    },
    onError: (error) => {
      show_toast("Error deleting", error.message, "error");
    },
  });

  // Derived
  const totalLoading = isFetching || load1 || load2;

  // Return JSX
  return (
    <>
      <ContentBox
        title="Quests"
        subtitle="Tasks to perform around the world"
        back_href="/manual"
      >
        Quests covers a wide range of activities within the game, including:
        <ul>
          <li className="pt-3">
            <b>Tier Quests: </b> These are progressively unlocked. Each quest tier has 3
            objectives, with their own rewards, and once all objectives are completed,
            the user can progress to the next tier. These are the same for all users and
            are generated by the content team.
          </li>
          <li className="pt-3">
            <b>Daily Quests: </b> Each day a new daily quest is generated. Daily quests
            have 3 random objectives to be completed. These are the same for all users
            based on their rank, and are randomly selected from the database.
          </li>
          <li className="pt-3">
            <b>Errands:</b> Errands are simple assignments that can be picked up at the
            mission hall to earn some quick cash. Anyone can perform errands. Errands
            are generated on the fly by an AI.
          </li>
          <li className="pt-3">
            <b>Missions: </b> Missions are more complex assignments that can be picked
            up at the mission hall. Only Genin+ can perform missions. Missions are
            generated on the fly by an AI.
          </li>
          <li className="pt-3">
            <b>Crimes: </b> Crimes are more complex assignments assigned by the criminal
            syndicate. Only outlaws can perform crimes. Crimes are generated on the fly
            by an AI.
          </li>
          <li className="pt-3">
            <b>Events: </b> These are occational one-time quests created by the content
            team.
          </li>
          <li className="pt-3">
            <b>Exams: </b> The are special quests unlocked when reaching certain levels,
            allowing the user to advance to the next rank.
          </li>
        </ul>
      </ContentBox>
      <ContentBox
        title="Overview"
        subtitle={`Review all ${questType}s in the system`}
        initialBreak={true}
        topRightContent={
          <div className="sm:flex sm:flex-row items-center">
            {userData && canChangeContent(userData.role) && (
              <div className="flex flex-row gap-1">
                <Button id="create-quest" onClick={() => create()}>
                  <FilePlus className="mr-1 h-6 w-6" />
                  New
                </Button>
                <MassEditContent
                  title="Mass Edit Quests"
                  type="quest"
                  button={
                    <Button id="create-quest">
                      <SquarePen className="mr-2 h-6 w-6" />
                      Edit
                    </Button>
                  }
                />
              </div>
            )}
            <SelectField
              id={questType}
              onChange={(e) => setQuestType(e.target.value as QuestType)}
            >
              {QuestTypes.map((questType) => {
                return (
                  <option key={questType} value={questType}>
                    {questType}
                  </option>
                );
              })}
            </SelectField>
          </div>
        }
      >
        {totalLoading && <Loader explanation="Loading data" />}
        {!totalLoading &&
          allQuests?.map((quest, i) => (
            <div
              key={quest.id}
              ref={i === allQuests.length - 1 ? setLastElement : null}
            >
              <ItemWithEffects
                item={quest}
                key={quest.id}
                onDelete={(id: string) => remove({ id })}
                showEdit="quest"
              />
            </div>
          ))}
      </ContentBox>
    </>
  );
};

export default ManualTravel;
