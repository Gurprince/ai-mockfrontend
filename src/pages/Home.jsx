import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

function Interview() {
  // Skill input state
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState([]);

  // Common interview state
  const [interviewType, setInterviewType] = useState("written"); // or 'verbal'
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Written interview states
  const [writtenResponses, setWrittenResponses] = useState({});
  const [writtenEvaluations, setWrittenEvaluations] = useState({});
  const [writtenScores, setWrittenScores] = useState({});

  // Verbal interview states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [verbalResponses, setVerbalResponses] = useState({});
  const [overallEvaluation, setOverallEvaluation] = useState("");

  // Refs for speech synthesis and recognition (for verbal mode)
  const recognition = useRef(null);
  const synth = useRef(window.speechSynthesis);

  // Generate questions from backend
  const generateQuestions = async () => {
    if (skills.length === 0) {
      alert("Please enter at least one skill.");
      return;
    }
    setLoadingQuestions(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/questions/generate-questions",
        {
          skills, // use skills entered by user
          interviewType,
        }
      );
      const qs = res.data.questions || [];
      setQuestions(qs);
      if (interviewType === "verbal" && qs.length > 0) {
        setCurrentQuestionIndex(0);
        speakQuestion(0, qs);
      }
    } catch (err) {
      console.error("Error generating questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Skill handling functions
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((skill) => skill !== skillToRemove));
  };

  // Written interview handlers
  const handleWrittenResponseChange = (index, value) => {
    setWrittenResponses((prev) => ({ ...prev, [index]: value }));
  };

  const evaluateWrittenAnswer = async (index) => {
    if (!questions[index] || !writtenResponses[index]?.trim()) return;
    try {
      const res = await axios.post(
        "http://localhost:5000/api/questions/evaluate",
        {
          question: questions[index],
          response: writtenResponses[index],
          interviewType,
        }
      );
      setWrittenEvaluations((prev) => ({
        ...prev,
        [index]: res.data.feedback,
      }));
      setWrittenScores((prev) => ({ ...prev, [index]: res.data.score }));
    } catch (err) {
      console.error("Error evaluating answer:", err);
    }
  };

  // Verbal interview handlers
  useEffect(() => {
    if (interviewType === "verbal") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = false;
        recognition.current.interimResults = false;
        recognition.current.lang = "en-US";
        recognition.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setVerbalResponses((prev) => ({
            ...prev,
            [currentQuestionIndex]: transcript,
          }));
        };
        recognition.current.onerror = (err) => {
          console.error("Speech recognition error:", err);
        };
      }
    }
  }, [interviewType, currentQuestionIndex]);

  const speakQuestion = (index, qs = questions) => {
    if (!qs[index]) return;
    synth.current.cancel();
    const utterance = new SpeechSynthesisUtterance(qs[index]);
    utterance.onend = () => {
      if (recognition.current) {
        recognition.current.start();
      }
    };
    synth.current.speak(utterance);
  };

  const nextVerbalQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      speakQuestion(nextIndex);
    } else {
      await evaluateOverallVerbal();
    }
  };

  const evaluateOverallVerbal = async () => {
    try {
      const combinedResponse = Object.values(verbalResponses).join("\n");
      const res = await axios.post(
        "http://localhost:5000/api/questions/evaluate",
        {
          question: "Overall verbal interview evaluation",
          response: combinedResponse,
          interviewType,
        }
      );
      setOverallEvaluation(res.data.feedback);
    } catch (err) {
      console.error("Error evaluating verbal interview:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-gray-100 p-6">
      <header className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-5xl font-extrabold text-blue-800">
          Mock Interviewer
        </h1>
        <p className="mt-3 text-lg text-gray-700">
          Practice your skills with AI-generated interview questions.
        </p>
      </header>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Skill input section */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Enter Your Skills</h2>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="e.g., JavaScript, React"
              className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addSkill}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Skill
            </button>
          </div>
          {skills.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Selected Skills:</h3>
              <ul className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <li
                    key={index}
                    className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full flex items-center"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-red-500 hover:text-red-600"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Interview Type Selection */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Select Interview Type</h2>
          <div className="flex items-center space-x-8">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="written"
                checked={interviewType === "written"}
                onChange={() => setInterviewType("written")}
                className="h-5 w-5 text-blue-600"
              />
              <span className="text-lg font-medium">Written Interview</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="verbal"
                checked={interviewType === "verbal"}
                onChange={() => setInterviewType("verbal")}
                className="h-5 w-5 text-blue-600"
              />
              <span className="text-lg font-medium">Verbal Interview</span>
            </label>
          </div>
        </section>

        {/* Generate Questions Button */}
        <section className="max-w-xl mx-auto">
          <button
            onClick={generateQuestions}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
          >
            {loadingQuestions
              ? "Generating Questions..."
              : "Generate Questions"}
          </button>
        </section>

        {/* Written Interview Section */}
        {interviewType === "written" && questions.length > 0 && (
          <section className="max-w-4xl mx-auto space-y-6">
            {questions.map((q, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="font-bold text-xl mb-3">Question {index + 1}</h3>
                <p className="mb-4 text-gray-800">{q}</p>
                <textarea
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={writtenResponses[index] || ""}
                  onChange={(e) =>
                    handleWrittenResponseChange(index, e.target.value)
                  }
                  placeholder="Type your answer here..."
                />
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={() => evaluateWrittenAnswer(index)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Evaluate Answer
                  </button>
                  {writtenEvaluations[index] && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-medium text-gray-800">
                        Feedback:{" "}
                        <span className="font-normal">
                          {writtenEvaluations[index]}
                        </span>
                      </p>
                      <p className="font-medium text-gray-800">
                        Score:{" "}
                        <span className="font-normal">
                          {writtenScores[index]}/10
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Verbal Interview Section */}
        {interviewType === "verbal" && questions.length > 0 && (
          <section className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Verbal Interview</h2>
              <div className="text-gray-700">
                {currentQuestionIndex + 1} / {questions.length}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-lg font-semibold text-gray-800">
                Question {currentQuestionIndex + 1}:
              </p>
              <p className="mt-1 text-gray-700">
                {questions[currentQuestionIndex]}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-lg font-semibold text-gray-800">
                Your Response:
              </p>
              <p className="mt-1 text-gray-700 italic">
                {verbalResponses[currentQuestionIndex] ||
                  "Waiting for response..."}
              </p>
            </div>
            <button
              onClick={nextVerbalQuestion}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
            >
              {currentQuestionIndex < questions.length - 1
                ? "Next Question"
                : "Finish Interview"}
            </button>
            {overallEvaluation && (
              <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">
                  Overall Evaluation
                </h3>
                <p className="mt-3 text-gray-700">{overallEvaluation}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default Interview;
