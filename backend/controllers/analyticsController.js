const Feedback = require('../models/Feedback');
const User = require('../models/User');

// @desc    Get dashboard analytics (Admin)
exports.getDashboard = async (req, res) => {
  try {
    const totalFeedback = await Feedback.countDocuments();

    const feedbackByStatus = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {
      Pending: 0,
      'Under Review': 0,
      Resolved: 0,
      Rejected: 0
    };

    feedbackByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    const feedbackByCategory = await Feedback.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          categoryIcon: '$categoryInfo.icon',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentFeedback = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const resolvedFeedback = await Feedback.find({ status: 'Resolved' });
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolvedFeedback.forEach(feedback => {
      const resolvedHistory = feedback.statusHistory.find(h => h.status === 'Resolved');
      if (resolvedHistory) {
        const timeDiff = resolvedHistory.changedAt - feedback.createdAt;
        totalResolutionTime += timeDiff;
        resolvedCount++;
      }
    });

    const averageResolutionTime = resolvedCount > 0 
      ? Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24))
      : 0;

    const resolutionRate = totalFeedback > 0 
      ? Math.round((statusCounts.Resolved / totalFeedback) * 100)
      : 0;

    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });

    const feedbackByPriority = await Feedback.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityCounts = {
      Low: 0,
      Medium: 0,
      High: 0
    };

    feedbackByPriority.forEach(item => {
      priorityCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      analytics: {
        totalFeedback,
        statusCounts,
        feedbackByCategory,
        recentFeedback,
        averageResolutionTime,
        resolutionRate,
        totalStudents,
        priorityCounts
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// @desc    Get feedback trends (Admin)
exports.getTrends = async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const trends = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.status(200).json({
      success: true,
      trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trends',
      error: error.message
    });
  }
};