import User from '../../models/User';

const defaultCommodities = [
  { symbol: 'Gold', enabled: true },
  { symbol: 'Silver', enabled: true },
  { symbol: 'Platinum', enabled: true },
  { symbol: 'Copper', enabled: true },
];

export const getCommodity = async (userName: string): Promise<any | null> => {
  const user = await User.findOne({ email: userName.toLowerCase() });
  if (!user) return null;
  return {
    _id: user._id,
    userName: user.email,
    companyName: user.companyName,
    email: user.email,
    commodities: defaultCommodities,
  };
};
