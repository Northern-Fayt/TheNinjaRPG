import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ContentBox from "@/layout/ContentBox";
import {
  aiAugmentSchema,
  statTemplateSchema,
  StatTemplateType,
} from "@/libs/combat/types";
import { showMutationToast } from "@/libs/toast";
import { api } from "@/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import Loader from "@/layout/Loader";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSearchValidator } from "@/validators/register";
import UserSearchSelect from "@/layout/UserSearchSelect";
import { useState } from "react";
import { BattleType, BattleTypes } from "@/drizzle/constants";
import { z } from "zod";
import { Label } from "@/components/ui/label";

export const AiAugmentCreator: React.FC = () => {
  const utils = api.useUtils();

  const maxUsers = 1;
  const userSearchSchema = getSearchValidator({ max: maxUsers });
  const userSearchMethods = useForm<z.infer<typeof userSearchSchema>>({
    resolver: zodResolver(userSearchSchema),
    defaultValues: { username: "", users: [] },
  });

  const [selectedAiAugment, setSelectedAiAugment] = useState<aiAugmentSchema>(
    {} as aiAugmentSchema,
  );

  // Data from database
  const { data: statTemplates } = api.staff.fetchAllStatTemplates.useQuery(
    { withDefault: true },
    {
      staleTime: Infinity,
    },
  );

  const { data: aiAugements } = api.staff.fetchAllAiAugements.useQuery(undefined, {
    staleTime: Infinity,
  });

  const setAiAugment = (id: string) => {
    const aiAugment = aiAugements?.find((x) => x.id === id);
    if (aiAugment) {
      setSelectedAiAugment(aiAugment);
    }
  };

  const targetUser = userSearchMethods.watch("users", [])?.[0];

  return (
    <ContentBox title="Create or Edit AI Augments">
      <div className="m-2">
        <Label>AI Augment</Label>
        <Select
          onValueChange={(e) => setAiAugment(e)}
          defaultValue={selectedAiAugment.id}
          value={selectedAiAugment.id}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Please Select an Augment`} />
          </SelectTrigger>
          <SelectContent>
            {aiAugements?.map((augment) => (
              <SelectItem key={augment.id} value={augment.id}>
                {augment.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="m-2">
        <Label>Name</Label>
        <Input
          type="text"
          id="aiAugmentName"
          placeholder="AI Augment Name"
          onChange={(e) =>
            setSelectedAiAugment({ ...selectedAiAugment, name: e.target.value })
          }
        />
      </div>

      <div className="m-2">
        <Label>User</Label>
        <UserSearchSelect
          useFormMethods={userSearchMethods}
          label="Search user you'd like to augment"
          selectedUsers={[]}
          showYourself={true}
          inline={true}
          maxUsers={maxUsers}
          showAi={true}
        />
      </div>
      <div className="m-2">
        <Label>Stat Template</Label>
        <Select
          onValueChange={(e) =>
            setSelectedAiAugment({ ...selectedAiAugment, statTemplateId: e })
          }
          defaultValue={selectedAiAugment.statTemplateId}
          value={selectedAiAugment.statTemplateId}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Please Select a Template`} />
          </SelectTrigger>
          <SelectContent>
            {statTemplates?.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="m-2">
        <Label>AI Type</Label>
        <Select
          onValueChange={(e: BattleType) =>
            setSelectedAiAugment({ ...selectedAiAugment, aiType: e })
          }
          defaultValue={selectedAiAugment.aiType}
          value={selectedAiAugment.aiType}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Please Select an AI Type`} />
          </SelectTrigger>
          <SelectContent>
            {BattleTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button size="lg" className="w-full m-2">
        Submit
      </Button>
    </ContentBox>
  );
};
