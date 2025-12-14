// components/RecruitmentDashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { 
  Briefcase, User, FileText, Calendar, 
  CheckCircle, XCircle, Clock, Mail,
  Award, Download, Upload, Edit
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const RecruitmentDashboard = () => {
  const { user } = useAuth();
  const [candidateData, setCandidateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (user) {
      loadCandidateData();
    }
  }, [user]);

  const loadCandidateData = async () => {
    try {
      setLoading(true);
      // Get the candidate data from recruitment_personnel table
      const { data, error } = await supabase
        .from("recruitment_personnel")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setCandidateData(data);
      }
    } catch (error) {
      console.error("Error loading candidate data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageIcon = (stage) => {
    switch (stage?.toLowerCase()) {
      case 'screening':
        return <FileText className="h-5 w-5" />;
      case 'interview scheduled':
      case 'technical interview':
      case 'final interview':
        return <Calendar className="h-5 w-5" />;
      case 'offer extended':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Briefcase className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Candidate Dashboard
              </h1>
              <p className="text-gray-600">
                Bureau of Fire Protection Villanueva - Recruitment Portal
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full ${getStatusColor(candidateData?.status)}`}>
                {candidateData?.status || 'Pending'}
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['profile', 'documents', 'timeline', 'messages'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                    {candidateData?.photo_url ? (
                      <img
                        src={candidateData.photo_url}
                        alt="Candidate"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {candidateData?.candidate || user?.name}
                    </h2>
                    <p className="text-gray-600">{candidateData?.position}</p>
                    <p className="text-gray-500 text-sm">
                      Applied: {new Date(candidateData?.application_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                  <Edit className="h-4 w-4 inline mr-2" />
                  Edit Profile
                </button>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Application ID:</span>
                      <span className="font-medium">{candidateData?.id?.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Username:</span>
                      <span className="font-medium">{candidateData?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stage:</span>
                      <span className="flex items-center font-medium">
                        {getStageIcon(candidateData?.stage)}
                        <span className="ml-2">{candidateData?.stage}</span>
                      </span>
                    </div>
                    {candidateData?.interview_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interview Date:</span>
                        <span className="font-medium">
                          {new Date(candidateData.interview_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <span>{candidateData?.username}</span>
                    </div>
                    {/* Add more contact info as needed */}
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              {candidateData?.resume_url && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-6 w-6 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium">Resume</p>
                          <p className="text-sm text-gray-500">Uploaded resume document</p>
                        </div>
                      </div>
                      <a
                        href={candidateData.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      >
                        <Download className="h-4 w-4 inline mr-1" />
                        View
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Status & Actions */}
          <div className="space-y-6">
            {/* Application Status Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${candidateData?.stage === 'Screening' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {candidateData?.stage === 'Screening' ? <CheckCircle className="h-5 w-5" /> : '1'}
                  </div>
                  <div>
                    <p className="font-medium">Screening</p>
                    <p className="text-sm text-gray-500">Initial application review</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${candidateData?.stage === 'Interview Scheduled' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {candidateData?.stage === 'Interview Scheduled' ? <CheckCircle className="h-5 w-5" /> : '2'}
                  </div>
                  <div>
                    <p className="font-medium">Interview</p>
                    <p className="text-sm text-gray-500">Scheduled for interview</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${candidateData?.stage === 'Technical Interview' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {candidateData?.stage === 'Technical Interview' ? <CheckCircle className="h-5 w-5" /> : '3'}
                  </div>
                  <div>
                    <p className="font-medium">Technical Assessment</p>
                    <p className="text-sm text-gray-500">Skills evaluation</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${candidateData?.stage === 'Final Interview' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {candidateData?.stage === 'Final Interview' ? <CheckCircle className="h-5 w-5" /> : '4'}
                  </div>
                  <div>
                    <p className="font-medium">Final Interview</p>
                    <p className="text-sm text-gray-500">Final evaluation</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${candidateData?.stage === 'Offer Extended' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {candidateData?.stage === 'Offer Extended' ? <CheckCircle className="h-5 w-5" /> : '5'}
                  </div>
                  <div>
                    <p className="font-medium">Offer</p>
                    <p className="text-sm text-gray-500">Job offer extended</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <Upload className="h-5 w-5 text-gray-400 mr-3" />
                    <span>Upload Documents</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <span>View Schedule</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <span>Contact HR</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RecruitmentDashboard;