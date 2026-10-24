"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
} from "@mui/material";
import {
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Work as WorkIcon,
  Psychology as PsychologyIcon,
} from "@mui/icons-material";
import Layout from "../components/Layout";

const learningPaths = [
  {
    title: "Lộ trình cho người mới bắt đầu",
    description: "Dành cho người chưa có kinh nghiệm với TOEIC",
    targetScore: "400-500 điểm",
    duration: "6 tháng",
    level: "Cơ bản",
    color: "#4caf50",
    steps: [
      "Học từ vựng cơ bản (1000 từ)",
      "Luyện nghe cơ bản",
      "Luyện đọc cơ bản",
      "Làm bài tập thực hành",
      "Thi thử định kỳ",
    ],
  },
  {
    title: "Lộ trình nâng cao",
    description: "Dành cho người đã có nền tảng cơ bản",
    targetScore: "550-700 điểm",
    duration: "4 tháng",
    level: "Trung cấp",
    color: "#ff9800",
    steps: [
      "Mở rộng từ vựng (2000 từ)",
      "Luyện nghe nâng cao",
      "Luyện đọc nâng cao",
      "Chiến thuật làm bài",
      "Thi thử chuyên sâu",
    ],
  },
  {
    title: "Lộ trình chuyên sâu",
    description: "Dành cho người muốn đạt điểm số cao",
    targetScore: "750+ điểm",
    duration: "3 tháng",
    level: "Nâng cao",
    color: "#f44336",
    steps: [
      "Từ vựng chuyên sâu (3000 từ)",
      "Luyện nghe chuyên sâu",
      "Luyện đọc chuyên sâu",
      "Kỹ thuật làm bài tối ưu",
      "Thi thử cường độ cao",
    ],
  },
  {
    title: "Lộ trình cấp tốc",
    description: "Dành cho người cần ôn thi trong thời gian ngắn",
    targetScore: "500-600 điểm",
    duration: "1 tháng",
    level: "Cấp tốc",
    color: "#9c27b0",
    steps: [
      "Từ vựng cốt lõi (800 từ)",
      "Luyện nghe cấp tốc",
      "Luyện đọc cấp tốc",
      "Chiến thuật làm bài nhanh",
      "Thi thử liên tục",
    ],
  },
  {
    title: "Lộ trình cho người đi làm",
    description: "Dành cho người bận rộn, học vào thời gian rảnh",
    targetScore: "450-650 điểm",
    duration: "8 tháng",
    level: "Linh hoạt",
    color: "#2196f3",
    steps: [
      "Học từ vựng theo chủ đề công việc",
      "Luyện nghe qua podcast",
      "Luyện đọc tài liệu thực tế",
      "Thực hành giao tiếp",
      "Thi thử cuối tuần",
    ],
  },
  {
    title: "Lộ trình tâm lý học",
    description: "Dành cho người muốn hiểu sâu về tâm lý học ngôn ngữ",
    targetScore: "600-800 điểm",
    duration: "5 tháng",
    level: "Chuyên sâu",
    color: "#ff5722",
    steps: [
      "Từ vựng tâm lý học (2500 từ)",
      "Luyện nghe phân tích sâu",
      "Luyện đọc hiểu tâm lý",
      "Kỹ thuật ghi nhớ khoa học",
      "Thi thử phân tích tâm lý",
    ],
  },
];

const LearningPathPage = () => {
  return (
    <Layout>
      <Box
        sx={{
          py: { xs: 4, md: 6 },
          backgroundColor: "#ffffff",
          minHeight: "100vh",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 2,
              }}
            >
              Lộ trình học TOEIC
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "#1B314B",
                maxWidth: 600,
                mx: "auto",
              }}
            >
              Chọn lộ trình phù hợp với trình độ hiện tại và mục tiêu của bạn
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {learningPaths.map((path, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Card
                  sx={{
                    height: "100%",
                    border: `3px solid ${path.color}`,
                    transition:
                      "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: `0 12px 40px ${path.color}20`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ textAlign: "center", mb: 3 }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: "50%",
                          backgroundColor: `${path.color}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mx: "auto",
                          mb: 2,
                        }}
                      >
                        {index === 0 && (
                          <SchoolIcon
                            sx={{ fontSize: 40, color: path.color }}
                          />
                        )}
                        {index === 1 && (
                          <TrendingUpIcon
                            sx={{ fontSize: 40, color: path.color }}
                          />
                        )}
                        {index === 2 && (
                          <EmojiEventsIcon
                            sx={{ fontSize: 40, color: path.color }}
                          />
                        )}
                        {index === 3 && (
                          <SpeedIcon sx={{ fontSize: 40, color: path.color }} />
                        )}
                        {index === 4 && (
                          <WorkIcon sx={{ fontSize: 40, color: path.color }} />
                        )}
                        {index === 5 && (
                          <PsychologyIcon
                            sx={{ fontSize: 40, color: path.color }}
                          />
                        )}
                      </Box>

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: "bold",
                          color: "#1B314B",
                          mb: 1,
                        }}
                      >
                        {path.title}
                      </Typography>

                      <Typography
                        variant="body1"
                        sx={{
                          color: "#1B314B",
                          mb: 2,
                        }}
                      >
                        {path.description}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "center",
                          mb: 3,
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          label={path.level}
                          sx={{
                            backgroundColor: `${path.color}20`,
                            color: path.color,
                          }}
                        />
                        <Chip
                          label={path.duration}
                          sx={{
                            backgroundColor: `${path.color}20`,
                            color: path.color,
                          }}
                        />
                      </Box>

                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: path.color,
                          mb: 3,
                        }}
                      >
                        Mục tiêu: {path.targetScore}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: "#1B314B",
                          mb: 2,
                        }}
                      >
                        Các bước thực hiện:
                      </Typography>

                      {path.steps.map((step, stepIndex) => (
                        <Box
                          key={stepIndex}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          <CheckCircleIcon
                            sx={{ fontSize: 20, color: path.color }}
                          />
                          <Typography variant="body2" color="#1B314B">
                            {step}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        backgroundColor: path.color,
                        color: "white",
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: path.color,
                          opacity: 0.9,
                        },
                      }}
                    >
                      Bắt đầu lộ trình
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Additional Info Section */}
          <Box
            sx={{ mt: 8, p: 4, backgroundColor: "#f8f9fa", borderRadius: 3 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                textAlign: "center",
                mb: 3,
              }}
            >
              Tại sao nên chọn lộ trình học có cấu trúc?
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: "center" }}>
                  <SchoolIcon sx={{ fontSize: 60, color: "#1976d2", mb: 2 }} />
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1B314B", mb: 1 }}
                  >
                    Học có hệ thống
                  </Typography>
                  <Typography variant="body2" color="#1B314B">
                    Lộ trình được thiết kế khoa học, giúp bạn học từ cơ bản đến
                    nâng cao một cách có hệ thống.
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: "center" }}>
                  <TrendingUpIcon
                    sx={{ fontSize: 60, color: "#1976d2", mb: 2 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1B314B", mb: 1 }}
                  >
                    Tiến bộ nhanh chóng
                  </Typography>
                  <Typography variant="body2" color="#1B314B">
                    Với lộ trình rõ ràng, bạn sẽ thấy sự tiến bộ rõ rệt qua từng
                    giai đoạn học tập.
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: "center" }}>
                  <EmojiEventsIcon
                    sx={{ fontSize: 60, color: "#1976d2", mb: 2 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1B314B", mb: 1 }}
                  >
                    Đạt mục tiêu
                  </Typography>
                  <Typography variant="body2" color="#1B314B">
                    Mỗi lộ trình đều hướng đến một mục tiêu cụ thể, giúp bạn đạt
                    được điểm số mong muốn.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
};

export default LearningPathPage;
