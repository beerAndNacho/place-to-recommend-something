import { PlaceExplorer } from "@/components/PlaceExplorer";
import { MOCK_PLACES } from "@/data/places";

export default function HomePage() {
  return <PlaceExplorer initialPlaces={MOCK_PLACES} />;
}
