import React, { useState, useEffect, useContext } from "react";
import "./Leaves.css";
import { useNavigate } from "react-router-dom";
import url from "../../../public/api";
import { LoginContext } from "../context/LoginContext";
import leaveTypes from "../../../public/leaves";
import LoadingSpinner from "../Loader/LoadingSpinner";
import { useLoader } from "../context/LoadingContext";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const Leaves = () => {
  const dataContext = useContext(LoginContext);
  const { email } = dataContext;
  const { loading, setLoading } = useLoader();
  const navigate = useNavigate();
  const [leaveResult, setLeaveResult] = useState();
  const [hasAppliedToday, setHasAppliedToday] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [leaveData, setLeaveData] = useState({
    type: "leave",
    leaveType: "",
    reason: "",
    fromDate: getTodayDate(),
    toDate: getTodayDate(),
    email: email,
  });

  const [remainingLeaves, setRemainingLeaves] = useState();
  const [halfDay, setHalfDay] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveDetails, setLeaveDetails] = useState([]);

  const checkTodayLeaveApplication = async () => {
    try {
      const response = await fetch(
        `${url}?email=${email}&type=checkTodayLeave&date=${getTodayDate()}`
      );
      const result = await response.json();
      setHasAppliedToday(result.hasApplied);
    } catch (error) {
      console.error("Error checking today's leave application:", error);
    }
  };

  useEffect(() => {
    if (!email) {
      navigate("/");
    } else {
      fetchAvailableLeaveTypes().then((types) => {
        setAvailableLeaveTypes(types);
      });
      checkTodayLeaveApplication();
    }
  }, [email, navigate]);

  useEffect(() => {
    console.log("Available leave types:", availableLeaveTypes);
  }, [availableLeaveTypes]);

  const fetchAvailableLeaveTypes = async () => {
    try {
      const response = await fetch(
        `${url}?email=${email}&type=availableLeaves`
      );
      const result = await response.json();
      setLeaveResult(result);

      // Filter leave types based on their availability (count > 0)
      const availableTypes = Object.keys(result).filter(
        (leaveType) => result[leaveType] > 0
      );

      const newResult = Object.entries(result);

      console.log("Available lqiwgdouyasdoiua:", newResult);
      return availableTypes;
    } catch (error) {
      console.error("Error fetching leave types:", error);
      return [];
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "leaveType") {
      const leaves = leaveResult[value];
      setRemainingLeaves(leaves);

      // Reset toDate when leaveType changes
      setLeaveData((prev) => ({
        ...prev,
        [name]: value,
        toDate: prev.fromDate, // Reset toDate to fromDate
      }));
    } else if (name === "fromDate") {
      const maxEndDate = calculateMaxEndDate(value, remainingLeaves);
      setLeaveData((prev) => ({
        ...prev,
        fromDate: value,
        toDate: value, // Reset toDate to new fromDate
      }));
    } else {
      setLeaveData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleHalfDayChange = (e) => {
    setHalfDay(e.target.checked);
  };

  const calculateNumberOfDays = (fromDate, toDate, halfDay) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    let totalDays = 0;
    let currentDate = new Date(from);

    while (currentDate <= to) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dateOfMonth = currentDate.getDate();
      const isSecondSaturday =
        dayOfWeek === 6 && dateOfMonth >= 8 && dateOfMonth <= 14;
      const isFourthSaturday =
        dayOfWeek === 6 && dateOfMonth >= 22 && dateOfMonth <= 28;

      if (dayOfWeek !== 0 && !isSecondSaturday && !isFourthSaturday) {
        totalDays++;
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Adjust for half-day deduction
    if (halfDay) {
      // If the range is only one day, deduct 0.5 day
      if (from.getTime() === to.getTime()) {
        totalDays -= 0.5;
      }
      // Otherwise, deduct 0.5 for the start date
      else if (from.getTime() !== to.getTime()) {
        totalDays -= 0.5;
      }
    }

    return totalDays;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (hasAppliedToday) {
      setError("You have already applied for leave today.");
      return;
    }
  
    setLoading(true);
    handleLoading(true);
    if (
      !leaveData.leaveType ||
      !leaveData.reason ||
      !leaveData.fromDate ||
      !leaveData.toDate ||
      !leaveData.email
    ) {
      setError("All fields are required.");
      setLoading(false);
      handleLoading(false);
      return;
    }

    if (!availableLeaveTypes.includes(leaveData.leaveType)) {
      setError("Selected leave type is not available.");
      setLoading(false);
      return;
    }

    // Calculate the number of days
    const numberOfDays = calculateNumberOfDays(
      leaveData.fromDate,
      leaveData.toDate,
      halfDay
    );
    const submitTime = new Date();
    const submitTimestamp = `${submitTime.toLocaleDateString(
      "en-GB"
    )} ${submitTime.getHours().toString().padStart(2, "0")}:${submitTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${submitTime
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;

    const leaveDataWithDays = {
      ...leaveData,
      numberOfDays,
      timestamp: submitTimestamp,
      //  managerEmail: "alpanachavan20@navgurukul.org"
    };

    setError(""); // Clear any previous error messages

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leaveDataWithDays),
      mode: "no-cors",
    })
      .then((response) => response.text())
      .then((data) => {
        setSuccessMessage("Leave request submitted successfully!");
        setHasAppliedToday(true);
        setLeaveData({
          type: "leave",
          leaveType: "",
          reason: "",
          fromDate: getTodayDate(),
          toDate: getTodayDate(),
          email: email,
        });
        setHalfDay(false);
        setLoading(false);
        handleLoading(false);
        setTimeout(() => setSuccessMessage(""), 4000); // Clear message after 4 seconds
      })
      .catch((error) => {
        console.error("Error sending data to Google Apps Script:", error);
        setError("Error submitting leave request.");
        setLoading(false);
        handleLoading(false);
      });
  };

  const handleLoading = (load) => {
    document.getElementById("root").style.opacity = load ? "0.8" : "1";
  };

  // Dummy leave details - replace this with actual data
  // const sampleLeaveData = [
  //   { leaveType: "Exam Leave", balance: 5, booked: 0, available: 5 },
  //   { leaveType: "Casual Leave", balance: 7, booked: 7, available: 0 },
  //   { leaveType: "Bereavement Leave", balance: 3, booked: 0, available: 3 },
  // ];

  const apiUrl = `https://script.google.com/macros/s/AKfycbyjEdP-0Q-vdtR8bU0wtgxghfqS_AVHc2dKRUTjjbuzLcdmt81f9lru5AnTF-B5gEum/exec?email=${email}&&type=balanceleave`;

  const fetchLeaveDetails = async () => {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log("Fetched leave details:", data);

      // If the response is an object, convert it to an array
      // and ignore "currentDate"
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const transformed = Object.entries(data)
          .filter(([key]) => key !== "currentDate") // Exclude currentDate
          .map(([leaveType, leaveObj]) => ({
            // Convert { balanced, booked, available }
            // into the row shape your table expects
            leaveType,
            balance: leaveObj.balanced ?? 0,
            booked: leaveObj.booked ?? 0,
            available: leaveObj.available ?? 0,
          }));
        setLeaveDetails(transformed);
      } else if (Array.isArray(data)) {
        // If the server was already returning an array
        setLeaveDetails(data);
      } else {
        // If something else, fallback
        setLeaveDetails([]);
      }
    } catch (error) {
      console.error("Error fetching leave details:", error);
      setLeaveDetails([]);
    }
  };

  useEffect(() => {
    fetchLeaveDetails();
  }, []);

  const handleModalOpen = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);

  const calculateMaxEndDate = (startDate, availableLeaves) => {
    if (!startDate || !availableLeaves) return null;

    const start = new Date(startDate);
    let currentDate = new Date(start);
    let daysToAdd = 0;
    let leavesCount = 0;

    while (leavesCount < availableLeaves) {
      const dayOfWeek = currentDate.getDay();
      const dateOfMonth = currentDate.getDate();
      const isSecondSaturday =
        dayOfWeek === 6 && dateOfMonth >= 8 && dateOfMonth <= 14;
      const isFourthSaturday =
        dayOfWeek === 6 && dateOfMonth >= 22 && dateOfMonth <= 28;

      // Only count if it's a working day
      if (dayOfWeek !== 0 && !isSecondSaturday && !isFourthSaturday) {
        leavesCount++;
      }

      if (leavesCount < availableLeaves) {
        daysToAdd++;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const maxDate = new Date(start);
    maxDate.setDate(maxDate.getDate() + daysToAdd);

    // Format the date to YYYY-MM-DD
    return maxDate.toISOString().split("T")[0];
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        // padding: "1rem",
      }}
    >
      <LoadingSpinner loading={loading} />
      {hasAppliedToday && (
        <div
          style={{
            color: "red",
            backgroundColor: "#ffebee",
            padding: "1rem",
            borderRadius: "4px",
            marginBottom: "1rem",
            width: "80%",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          You have already applied for leave today. You can only submit one
          leave application per day.
        </div>
      )}
      <h1 style={{ textAlign: "center" }}>Leave Application Form</h1>
      <p style={{ textAlign: "center" }}>
        Make sure to check the leave balance before applying
      </p>
      <form onSubmit={handleSubmit} className="form-1">
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div>
          <button
            style={{ width: "150px", textAlign: "right" }}
            onClick={handleModalOpen}
          >
            View Leave Details
          </button>
          <div>
            <label>Employee Email:</label>
            <input
              type="email"
              name="email"
              value={leaveData.email}
              onChange={handleChange}
              required
              disabled
            />
          </div>
          <label>
            Leave Type: &nbsp;
            {leaveData.leaveType ? (
              <span>
                You have <span style={{ color: "red" }}>{remainingLeaves}</span>{" "}
                leaves available in this category
              </span>
            ) : (
              ""
            )}
          </label>
          <select
            name="leaveType"
            value={leaveData.leaveType}
            onChange={handleChange}
            required
          >
            <option value="">--Select Leave Type--</option>
            {availableLeaveTypes &&
              availableLeaveTypes.map((leaveType, index) => (
                <option key={index} value={leaveType}>
                  {leaveType}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label>Reason for Leave:</label>
          <textarea
            name="reason"
            value={leaveData.reason}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>From Date:</label>
          <input
            type="date"
            name="fromDate"
            value={leaveData.fromDate}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>To Date:</label>
          <input
            type="date"
            name="toDate"
            value={leaveData.toDate}
            onChange={handleChange}
            min={leaveData.fromDate}
            max={calculateMaxEndDate(leaveData.fromDate, remainingLeaves)}
            required
          />
        </div>
        <div className="tooltip">
          How to use Half Day?
          <span
            style={{
              width: "300px",
            }}
            className="tooltiptext"
          >
            Note: Do not change the date if you want to avail half day for the
            single day. If the date is increased by 1 and halfday is checked You
            will be availing today's leave + tomorrow's + half day.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "baseline",
            marginTop: "10px",
          }}
        >
          <label style={{ width: "25%" }}>Half Day:</label>
          <input
            style={{
              width: "20px",
            }}
            type="checkbox"
            name="halfDay"
            checked={halfDay}
            onChange={handleHalfDayChange}
          />
        </div>

        {/* <button type="submit">Submit</button> */}
        <button
          type="submit"
          disabled={hasAppliedToday}
          style={{
            opacity: hasAppliedToday ? 0.5 : 1,
            cursor: hasAppliedToday ? "not-allowed" : "pointer",
          }}
        >
          Submit
        </button>
      </form>
      <Snackbar
        open={successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Modal for Leave Details */}
      <Dialog
        open={isModalOpen}
        onClose={handleModalClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Leave Details</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Leave Type</TableCell>
                  <TableCell align="center">Balance</TableCell>
                  <TableCell align="center">Booked</TableCell>
                  <TableCell align="center">Available</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(leaveDetails) &&
                  leaveDetails.map((row, index) => (
                    <TableRow key={index} tabIndex={-1}>
                      <TableCell >{row.leaveType}</TableCell>
                      <TableCell  align="center">{row.balance}</TableCell>
                      <TableCell  align="center">{row.booked}</TableCell>
                      <TableCell  align="center">{row.available}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leaves;
