import { io } from "../../config/socket_io.js";
import {
  getRetailGoldRatesByAdminId,
  replaceRetailGoldRatesForAdmin,
} from "../../helper/retailGoldRateHelper.js";

const emitRetailGoldRateUpdated = () => {
  io.emit("retail-gold-rate-updated");
};

export const getRetailGoldRates = async (req, res) => {
  try {
    const { adminId } = req.params;
    const result = await getRetailGoldRatesByAdminId(adminId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json(result.rates);
  } catch (error) {
    console.error("Error fetching retail gold rates:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching retail gold rates",
      error: error.message,
    });
  }
};

export const replaceRetailGoldRates = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { rates } = req.body;

    if (!Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "rates array is required.",
      });
    }

    for (const item of rates) {
      if (!item.name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Each rate must have a name.",
        });
      }
      const parsedRate = parseFloat(item.rate);
      if (isNaN(parsedRate)) {
        return res.status(400).json({
          success: false,
          message: "Each rate must be numeric.",
        });
      }
    }

    const result = await replaceRetailGoldRatesForAdmin(adminId, rates);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    emitRetailGoldRateUpdated();

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.rates,
    });
  } catch (error) {
    console.error("Error saving retail gold rates:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving retail gold rates",
      error: error.message,
    });
  }
};
