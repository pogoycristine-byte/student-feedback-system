import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { feedbackAPI } from '../services/api';
import { ArrowLeft, Send, MapPin, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FeedbackChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Get anonymous flag from location state
  const isAnonymous = location.state?.isAnonymous || false;

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await feedbackAPI.getMessages(id);
      setFeedback(response.data.feedback);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await feedbackAPI.sendMessage(id, newMessage.trim());
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getRoleLabel = (senderRole) => {
    if (senderRole === 'admin') return 'Admin';
    if (senderRole === 'staff') return 'Staff';
    return 'Student';
  };

  const getSenderDisplayName = (sender, senderRole) => {
    // If feedback is anonymous and sender is student, show "Anonymous Student"
    if (isAnonymous && senderRole === 'student') {
      return 'Anonymous Student';
    }
    // If sender is staff, show "Staff"
    if (senderRole === 'staff') {
      return 'Staff';
    }
    // If sender is admin, show "Admin"
    if (senderRole === 'admin') {
      return 'Admin';
    }
    return sender?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/feedback')}
          className="p-2 hover:bg-white/10 rounded-lg transition-all"
        >
          <ArrowLeft className="text-white" size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{feedback?.subject}</h1>
          <p className="text-gray-400 text-sm">
            Student: {isAnonymous ? 'Anonymous Student' : feedback?.student?.name} ({!isAnonymous && feedback?.student?.studentId}) • Status: {feedback?.status}
          </p>
          <div className="flex flex-wrap gap-4 mt-2">
            {feedback?.location && (
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <MapPin size={14} className="text-violet-400" />
                <span>{feedback.location}</span>
              </div>
            )}
            {feedback?.dateTime && (
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <Clock size={14} className="text-pink-400" />
                <span>{feedback.dateTime}</span>
              </div>
            )}
            {feedback?.createdAt && (
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <Calendar size={14} className="text-blue-400" />
                <span>Submitted: {new Date(feedback.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white/5 backdrop-blur-lg rounded-xl border border-white/20 p-6 overflow-y-auto mb-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, index) => {
              // My own messages go right, everyone else goes left
              const isMyMessage = msg.sender?._id === user?._id || msg.sender?._id === user?.id;
              const roleLabel = getRoleLabel(msg.senderRole);
              const senderDisplayName = getSenderDisplayName(msg.sender, msg.senderRole);

              return (
                <div
                  key={index}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md px-4 py-3 rounded-2xl ${
                      isMyMessage
                        ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <p className={`text-xs mb-1 ${isMyMessage ? 'opacity-80' : 'opacity-70'}`}>
                      {senderDisplayName} • {roleLabel}
                    </p>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isMyMessage ? 'opacity-80' : 'opacity-50'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          disabled={sending}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send size={18} />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackChat;