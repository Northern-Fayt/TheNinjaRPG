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
import { statTemplateSchema, StatTemplateType } from "@/libs/combat/types";
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

interface SelectStatTemplateProps {
  selectedStatTemplate: StatTemplateType | null;
  setSelectedStatTemplate: React.Dispatch<
    React.SetStateAction<StatTemplateType | null>
  >;
}

interface CreateStatTemplateProps {
  statTemp: StatTemplateType;
}

export const SelectStatTemplate: React.FC<SelectStatTemplateProps> = (props) => {
  const { selectedStatTemplate, setSelectedStatTemplate } = props;

  // Data from database
  const { data: statTemplates } = api.staff.fetchAllStatTemplates.useQuery(
    { withDefault: true },
    {
      staleTime: Infinity,
    },
  );

  const setStatSchema = (id: string) => {
    const statTemp = statTemplates?.find((x) => x.id === id);
    if (statTemp) {
      setSelectedStatTemplate(statTemp);
    }
  };

  return (
    <>
      <Select
        onValueChange={(e) => setStatSchema(e)}
        defaultValue={selectedStatTemplate?.id}
        value={selectedStatTemplate?.id}
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

      {selectedStatTemplate && <CreateStatTemplate statTemp={selectedStatTemplate} />}
    </>
  );
};

export const CreateStatTemplate: React.FC<CreateStatTemplateProps> = (props) => {
  // Destructure
  const { statTemp } = props;

  console.log("statTemp", statTemp);
  // Mutation for creating or updating stat template
  const { mutate: createStatTemplate, isPending: isCreating } =
    api.staff.upsertStatTemplate.useMutation({
      onSuccess: async (data) => {
        if (data.success) {
          showMutationToast({ ...data, message: "Created or updated stat template." });
        } else {
          showMutationToast(data);
        }
      },
    });

  // Stats Schema
  var defaultValues = statTemp;
  const statNames = Object.keys(defaultValues) as (keyof typeof defaultValues)[];

  // Form setup
  const form = useForm<StatTemplateType>({
    defaultValues,
    values: defaultValues,
    mode: "all",
    resolver: zodResolver(statTemplateSchema),
  });

  // Submit handler
  const onSubmit = form.handleSubmit((data) => {
    createStatTemplate(data);
  });

  // Show component
  return (
    <ContentBox title="Create Or Edit Stat Template" subtitle="" initialBreak={true}>
      <Form {...form} key={statTemp.id}>
        <form className="grid grid-cols-2 gap-2" onSubmit={onSubmit}>
          {statNames.map((stat, i) => {
            switch (stat) {
              case "id":
                return null;
              case "name":
                return (
                  <FormField
                    key={i}
                    control={form.control}
                    name={stat}
                    render={({ field }) => (
                      <FormItem className="pt-1">
                        <FormLabel>{stat}</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder={stat} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              case "scalingType":
                return (
                  <FormField
                    key={i}
                    control={form.control}
                    name={stat}
                    render={({ field }) => (
                      <FormItem className="pt-1">
                        <FormLabel>{stat}</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder={stat} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              case "offenceType":
                return (
                  <FormField
                    key={i}
                    control={form.control}
                    name={stat}
                    render={({ field }) => (
                      <FormItem className="pt-1">
                        <FormLabel>{stat}</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder={stat} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              default:
                return (
                  <FormField
                    key={i}
                    control={form.control}
                    name={stat}
                    render={({ field }) => (
                      <FormItem className="pt-1">
                        <FormLabel>{stat}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={stat} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
            }
          })}
          {!isCreating ? (
            <div className="col-span-2 flex flex-row justify-center">
              <Button size="xl" className="font-fontasia text-4xl w-full">
                Submit
              </Button>
            </div>
          ) : (
            <div className="min-h-64">
              <div className="absolute bottom-0 left-0 right-0 top-0 z-20 m-auto flex flex-col justify-center bg-black opacity-95">
                <div className="m-auto text-white">
                  <p className="text-5xl">Submitting Stat Template</p>
                  <Loader />
                </div>
              </div>
            </div>
          )}
        </form>
      </Form>
    </ContentBox>
  );
};
