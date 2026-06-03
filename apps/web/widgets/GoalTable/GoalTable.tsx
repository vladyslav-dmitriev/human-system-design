import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GoalTableProps = {
  data: {
    date: string;
    expect: number;
    actual: number;
    comment?: string;
  }[];
};

export const GoalTable = ({ data }: GoalTableProps) => {
  const tableData = [...data].reverse();

  return (
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[150px]">Date</TableHead>
          <TableHead className="w-[100px]">Expect</TableHead>
          <TableHead className="w-[100px]">Actual</TableHead>
          <TableHead>Comment</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {tableData.map((item, index) => {
          const prevCount = tableData[index + 1]?.actual;

          const getActualColor = () => {
            if (typeof prevCount === "number" && item.actual > prevCount) {
              return "text-red-400";
            }

            if (typeof prevCount === "number" && item.actual < prevCount) {
              return "text-green-400";
            }

            return undefined;
          };

          const getBgColor = () => {
            if (item.actual > item.expect) {
              return "bg-red-50";
            }

            if (item.actual <= item.expect) {
              return "bg-green-50";
            }
          };

          const getArrow = () => {
            if (typeof prevCount === "number" && item.actual > prevCount) {
              return "↑";
            }

            if (typeof prevCount === "number" && item.actual < prevCount) {
              return "↓";
            }

            return "";
          };

          return (
            <TableRow key={item.date} className={getBgColor()}>
              <TableCell className="font-medium">{item.date}</TableCell>
              <TableCell className="font-medium">{item.expect}</TableCell>
              <TableCell
                className={getActualColor()}
              >{`${item.actual} ${getArrow()}`}</TableCell>
              <TableCell>{item.comment}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">$2,500.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
};
