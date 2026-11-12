import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyReports() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={{ pathname: "/reports", params: { id: id ?? "" } }} />;
}
