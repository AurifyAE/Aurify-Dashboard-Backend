import User from "../../models/User";
import SpotRate from "../../models/SpotRate";

export const getMetals = async (userName: string): Promise<string[] | null> => {
  const user = await User.findOne({ email: userName.toLowerCase() });
  if (!user) return null;
  const spotRate = await SpotRate.findOne({ createdBy: user._id });
  if (!spotRate) return [];
  return [...new Set(spotRate.commodities.map((c: any) => c.metal))];
};
