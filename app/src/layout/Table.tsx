import AvatarImage from "@/layout/Avatar";
import { Button } from "@/components/ui/button";
import { useSafePush } from "@/utils/routing";
import { secondsPassed } from "@/utils/time";
import { capitalizeFirstLetter } from "@/utils/sanitize";

export type ColumnDefinitionType<T, K extends keyof T> = {
  key: K;
  header: string;
  width?: number;
  onChange?: (id: string, column: string, value: string) => void;
  type: "avatar" | "string" | "capitalized" | "time_passed" | "date" | "jsx" | "input";
};

type TableProps<T, K extends keyof T> = {
  data: Array<T> | undefined;
  columns: Array<ColumnDefinitionType<T, K>>;
  linkColumn?: K;
  linkPrefix?: string;
  buttons?: {
    label: string;
    onClick: (row: T) => void;
  }[];
  setLastElement?: (element: HTMLDivElement | null) => void;
};

const Table = <T, K extends keyof T>(props: TableProps<T, K>) => {
  const { data, columns } = props;
  const router = useSafePush();

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-sm ">
        <thead className="bg-amber-900 text-xs uppercase text-white">
          <tr>
            {columns.map((column, i) => (
              <th key={i} scope="col" className="px-6 py-3">
                {column.header}
              </th>
            ))}
            {props.buttons && (
              <th scope="col" className="px-6 py-3">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data?.map((row, i) => (
            <tr
              key={`row-${i}`}
              ref={i === data.length - 1 ? props.setLastElement : null}
              className={`border-b border-gray-700 ${
                i % 2 == 0 ? "bg-orange-50" : "bg-yellow-50"
              } ${props.linkColumn ? "cursor-pointer hover:bg-orange-300" : ""}`}
              onClick={async (e) => {
                e.preventDefault();
                if (props.linkColumn) {
                  let route = row[props.linkColumn] as string;
                  route = props.linkPrefix ? props.linkPrefix + route : route;
                  await router.push(route);
                }
              }}
            >
              {columns.map((column, i) => (
                <td
                  key={`cell-${i}`}
                  className={`px-3 py-2`}
                  style={{
                    width: column.width ? `${column.width}rem` : "auto",
                    minWidth: column.width ? `${column.width}rem` : "auto",
                  }}
                >
                  {column.type === "avatar" && (
                    <AvatarImage
                      href={row[column.key] as string}
                      alt={row[column.key] as string}
                      size={100}
                      hover_effect={true}
                      priority
                    />
                  )}
                  {column.type === "input" && (
                    <AvatarImage
                      href={row[column.key] as string}
                      alt={row[column.key] as string}
                      size={100}
                      hover_effect={true}
                      priority
                    />
                  )}
                  {column.type === "string" && (row[column.key] as string)}
                  {column.type === "jsx" && (row[column.key] as JSX.Element)}
                  {column.type === "capitalized" &&
                    capitalizeFirstLetter(row[column.key] as string)}
                  {column.type === "date" && (row[column.key] as Date).toLocaleString()}
                  {column.type === "time_passed" && (
                    <p className="text-center">
                      {Math.floor(secondsPassed(row[column.key] as Date) / 60)}
                      <br />
                      minutes ago
                    </p>
                  )}
                </td>
              ))}
              {props.buttons && (
                <td className="px-6 py-4">
                  {props.buttons.map((button, i) => (
                    <Button
                      id={`button-${i}`}
                      key={`button-${i}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        button.onClick(row);
                      }}
                    >
                      {button.label}
                    </Button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
