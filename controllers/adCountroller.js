import { Ad } from "../models/Ad.js";
import { getVideoDurationInSeconds } from "get-video-duration";
import { cloudinary } from "../middlewares/cloudinary.js";
import { Counter } from "../models/Counter.js";
import { AdSchedule } from "../models/AdSchedule.js";

// Helper function to get next sequential ID
const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.value;
};



export const createAd = async (req, res) => {
  let cloudinaryPublicId = null; 
  console.log("file",req.file)
  try {
    if (!req.file || !req.file.path) {
      throw new Error("Video file is required"); 
    }

    const adId = await getNextSequenceValue("adId");

    //  Already uploaded by multer-storage-cloudinary
    const videoUrl = req.file.path;                // Cloudinary URL
    cloudinaryPublicId = req.file.filename;        // Your custom public_id

    //  Fetch metadata from Cloudinary API
    const videoMeta = await cloudinary.api.resource(cloudinaryPublicId, {
      resource_type: "video",
      media_metadata: true,
    });

    // Extract fields
    let duration = videoMeta.duration;
    const videoFormat = videoMeta.format;
    const videoSize = videoMeta.bytes;

    // Fallback for duration
    if (!duration) {
      try {
        duration = await getVideoDurationInSeconds(videoMeta.secure_url);
      } catch (err) {
       await console.error("Failed to fetch duration:", err);
           throw new Error("Unable to calculate video duration.");
      }
    }

    // Required checks
    if (!videoFormat || !videoSize || !duration) {
      throw new Error("Video metadata is incomplete (format/size/duration missing).");
    }

    //  Save Ad in DB
    const ad = await Ad.create({
      adId,
      title: req.body.title,
      description: req.body.description,
      advertiser: req.body.advertiser, // required
      categories: req.body.categories ? req.body.categories.split(",") : [],
      // status: req.body.status || "draft",
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,

      videoUrl,
      cloudinaryPublicId,
      duration,
      videoFormat,
      videoSize,
    });

    return res.status(201).json({
      success: true,
      message: "Ad created successfully",
      data: ad,
    });
  } catch (error) {
    console.error("Error creating ad:", error);

    //  Clean up Cloudinary upload if DB save failed or early validation failed
    if (cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(cloudinaryPublicId, {
          resource_type: "video",
        });
        console.log(`❌ Rolled back upload: ${cloudinaryPublicId}`);
      } catch (cleanupError) {
        console.error("Failed to cleanup Cloudinary upload:", cleanupError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "error aa rahi hai"+error.message || "Failed to create ad",
    });
  }
};


export const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    const updateData = req.body;

    // categories string → array
    if (updateData.categories && typeof updateData.categories === "string") {
      updateData.categories = updateData.categories.split(",");
    }

    // ✅ Normal fields update
    const allowedFields = ["title", "description", "advertiser", "categories", "isActive"];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) ad[field] = updateData[field];
    });

    // ✅ Agar nayi video aayi hai
    if (req.file && req.file.path) {
      // 1. Purani video delete karo
      if (ad.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(ad.cloudinaryPublicId, { resource_type: "video" });
        } catch (err) {
          console.error("Failed to delete old video:", err);
        }
      }

      // 2. Nayi video ka meta lao
      const newPublicId = req.file.filename;
      let videoMeta = await cloudinary.api.resource(newPublicId, { resource_type: "video" });

      let duration = videoMeta.duration;
      const videoFormat = videoMeta.format;
      const videoSize = videoMeta.bytes;

      // 🔄 Fallback for duration if missing
      if (!duration) {
        try {
          duration = await getVideoDurationInSeconds(videoMeta.secure_url);
        } catch (err) {
          console.error("Failed to fetch duration:", err);
          throw new Error("Unable to calculate video duration.");
        }
      }

      if (!videoFormat || !videoSize || !duration) {
        throw new Error("Video metadata is incomplete (format/size/duration missing).");
      }

      ad.videoUrl = req.file.path;
      ad.cloudinaryPublicId = newPublicId;
      ad.duration = duration;
      ad.videoFormat = videoFormat;
      ad.videoSize = videoSize;
    }

    ad.updatedAt = Date.now();
    const updatedAd = await ad.save();

    res.status(200).json({
      success: true,
      message: "Ad updated successfully",
      data: updatedAd,
    });
  } catch (error) {
    console.error("Error updating ad:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};



export const getAds = async (req, res) => {
  try {
    const { advertiser, category, isActive, search } = req.query;

    let query = {};

    if (advertiser) query.advertiser = advertiser;
    if (category) query.categories = { $in: [category] };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { advertiser: { $regex: search, $options: 'i' } }
      ];
    }

    const ads = await Ad.find(query)
      .populate("advertiser")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Ads fetched successfully",
      data: ads
    });
  } catch (error) {
    console.error("Error fetching ads:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getUnscheduledAds = async (req, res) => {
  try {
    const { advertiser, category, search } = req.query;

    let query = {};

    if (advertiser) query.advertiser = advertiser;
    if (category) query.categories = { $in: [category] };
    query.isActive = 'true';

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { advertiser: { $regex: search, $options: 'i' } }
      ];
    }

    //  Step 1: Get all scheduled Ad IDs
    const scheduledAds = await AdSchedule.find().distinct("ad");

    //  Step 2: Get ads which are NOT in scheduledAds
    const ads = await Ad.find({
      _id: { $nin: scheduledAds },  // exclude already scheduled ads
      ...query                      // keep your existing filters
    })
      .populate("advertiser")
      .sort({ createdAt: -1 });


    res.status(200).json({
      success: true,
      message: "Ads fetched successfully",
      data: ads
    });
  } catch (error) {
    console.error("Error fetching ads:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getAdById = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Ad fetched successfully",
      data: ad
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid Ad ID"
      });
    }
    console.error("Error fetching ad by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found"
      });
    }

    // Delete from Cloudinary first
    if (ad.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(ad.cloudinaryPublicId, {
          resource_type: "video"
        });
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue with DB deletion even if Cloudinary deletion fails
      }
    }

    await ad.deleteOne();

    res.status(200).json({
      success: true,
      message: "Ad deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid Ad ID"
      });
    }
    console.error("Error deleting ad:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const toggleAdStatus = async (req, res) => {
  console.log("hi", req.params.id)
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found"
      });
    }

    ad.isActive = !ad.isActive;
    ad.updatedAt = Date.now();
    await ad.save();

    res.status(200).json({
      success: true,
      message: `Ad ${ad.isActive ? "activated" : "deactivated"} successfully`,
      data: ad
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Invalid Ad ID"
      });
    }
    console.error("Error toggling ad status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getAdCount = async (req, res) => {
  try {
    const { advertiser, category, isActive } = req.query;

    let query = {};

    if (advertiser) query.advertiser = advertiser;
    if (category) query.categories = { $in: [category] };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const count = await Ad.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Ad count fetched successfully",
      data: { count }
    });
  } catch (error) {
    console.error("Error getting ad count:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getAdsByAdvertiser = async (req, res) => {
  try {
    const { advertiser } = req.params;
    const { isActive } = req.query;

    let query = { advertiser };

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const ads = await Ad.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Ads fetched successfully by advertiser",
      data: ads
    });
  } catch (error) {
    console.error("Error fetching ads by advertiser:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getAdsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { isActive } = req.query;

    let query = { categories: { $in: [category] } };

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const ads = await Ad.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Ads fetched successfully by category",
      data: ads
    });
  } catch (error) {
    console.error("Error fetching ads by category:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

