"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Button,
  Avatar,
  Stack,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Headphones as HeadphonesIcon,
  MenuBook as MenuBookIcon,
} from "@mui/icons-material";
import Layout from "../components/Layout";

const blogPosts = [
  {
    id: 1,
    title: "10 Chiến thuật làm bài TOEIC Listening hiệu quả",
    excerpt:
      "Khám phá những bí quyết vàng giúp bạn chinh phục phần Listening trong bài thi TOEIC một cách dễ dàng.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    author: "Thầy Nguyễn Văn Minh",
    authorAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    date: "15/12/2024",
    readTime: "5 phút đọc",
    views: "2,350 lượt xem",
    category: "Listening",
    categoryIcon: <HeadphonesIcon />,
    categoryColor: "#4caf50",
    featured: true,
  },
  {
    id: 2,
    title: "Cách học từ vựng TOEIC nhớ lâu và hiệu quả",
    excerpt:
      "Phương pháp học từ vựng thông minh giúp bạn ghi nhớ hàng nghìn từ vựng TOEIC một cách bền vững.",
    image:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    author: "Cô Trần Thị Hương",
    authorAvatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    date: "12/12/2024",
    readTime: "7 phút đọc",
    views: "1,890 lượt xem",
    category: "Từ vựng",
    categoryIcon: <SchoolIcon />,
    categoryColor: "#ff9800",
    featured: false,
  },
  {
    id: 3,
    title: "Bí quyết làm bài TOEIC Reading trong thời gian ngắn",
    excerpt:
      "Chiến thuật quản lý thời gian và kỹ thuật làm bài giúp bạn hoàn thành phần Reading đúng giờ.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    author: "Thầy Lê Hoàng Nam",
    authorAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    date: "10/12/2024",
    readTime: "6 phút đọc",
    views: "2,100 lượt xem",
    category: "Reading",
    categoryIcon: <MenuBookIcon />,
    categoryColor: "#2196f3",
    featured: false,
  },
  {
    id: 4,
    title: "Lộ trình học TOEIC từ 0 đến 600 điểm",
    excerpt:
      "Hướng dẫn chi tiết lộ trình học TOEIC cho người mới bắt đầu, từ cơ bản đến nâng cao.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    author: "Cô Phạm Thị Lan",
    authorAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    date: "08/12/2024",
    readTime: "10 phút đọc",
    views: "3,200 lượt xem",
    category: "Lộ trình học",
    categoryIcon: <TrendingUpIcon />,
    categoryColor: "#9c27b0",
    featured: true,
  },
  {
    id: 5,
    title: "Những lỗi thường gặp trong bài thi TOEIC",
    excerpt:
      "Tổng hợp những lỗi phổ biến mà thí sinh thường mắc phải và cách khắc phục hiệu quả.",
    image:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    author: "Thầy Đỗ Văn Tài",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    date: "05/12/2024",
    readTime: "8 phút đọc",
    views: "1,750 lượt xem",
    category: "Kinh nghiệm",
    categoryIcon: <SchoolIcon />,
    categoryColor: "#f44336",
    featured: false,
  },
  {
    id: 6,
    title: "Cách chuẩn bị tâm lý trước kỳ thi TOEIC",
    excerpt:
      "Bí quyết giữ tinh thần thoải mái và tự tin để đạt kết quả tốt nhất trong kỳ thi TOEIC.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    author: "Cô Nguyễn Thị Mai",
    authorAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
    date: "03/12/2024",
    readTime: "4 phút đọc",
    views: "1,450 lượt xem",
    category: "Tâm lý thi cử",
    categoryIcon: <TrendingUpIcon />,
    categoryColor: "#607d8b",
    featured: false,
  },
];

const categories = [
  { name: "Tất cả", count: 24 },
  { name: "Listening", count: 8 },
  { name: "Reading", count: 6 },
  { name: "Từ vựng", count: 5 },
  { name: "Lộ trình học", count: 3 },
  { name: "Kinh nghiệm", count: 2 },
];

const BlogPage = () => {
  const featuredPosts = blogPosts.filter((post) => post.featured);
  const regularPosts = blogPosts.filter((post) => !post.featured);

  return (
    <Layout>
      <Box
        sx={{
          py: { xs: 4, md: 6 },
          backgroundColor: "#f8f9fa",
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
              Blog TOEIC
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "#1B314B",
                maxWidth: 600,
                mx: "auto",
              }}
            >
              Chia sẻ kiến thức, kinh nghiệm và bí quyết học TOEIC hiệu quả
            </Typography>
          </Box>

          {/* Categories Filter */}
          <Box
            sx={{
              mb: 6,
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {categories.map((category, index) => (
              <Chip
                key={index}
                label={`${category.name} (${category.count})`}
                variant={index === 0 ? "filled" : "outlined"}
                sx={{
                  backgroundColor: index === 0 ? "#1976d2" : "transparent",
                  color: index === 0 ? "white" : "#1976d2",
                  borderColor: "#1976d2",
                  "&:hover": {
                    backgroundColor: index === 0 ? "#1565c0" : "#e3f2fd",
                  },
                }}
              />
            ))}
          </Box>

          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: "#1B314B",
                  mb: 4,
                }}
              >
                Bài viết nổi bật
              </Typography>

              <Grid container spacing={4}>
                {featuredPosts.map((post) => (
                  <Grid size={{ xs: 12, md: 6 }} key={post.id}>
                    <Card
                      sx={{
                        height: "100%",
                        transition:
                          "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
                        },
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="200"
                        image={post.image}
                        alt={post.title}
                      />
                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 2,
                          }}
                        >
                          <Chip
                            icon={post.categoryIcon}
                            label={post.category}
                            size="small"
                            sx={{
                              backgroundColor: `${post.categoryColor}20`,
                              color: post.categoryColor,
                            }}
                          />
                          <Chip
                            label="Nổi bật"
                            size="small"
                            sx={{
                              backgroundColor: "#ff6f00",
                              color: "white",
                            }}
                          />
                        </Box>

                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: "bold",
                            color: "#1B314B",
                            mb: 2,
                            lineHeight: 1.3,
                          }}
                        >
                          {post.title}
                        </Typography>

                        <Typography
                          variant="body1"
                          sx={{
                            color: "#1B314B",
                            lineHeight: 1.6,
                            mb: 3,
                          }}
                        >
                          {post.excerpt}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 3,
                          }}
                        >
                          <Avatar
                            src={post.authorAvatar}
                            sx={{ width: 32, height: 32 }}
                          />
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: "#1B314B" }}
                            >
                              {post.author}
                            </Typography>
                            <Typography variant="caption" color="#666">
                              {post.date}
                            </Typography>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            mb: 3,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <CalendarIcon
                              sx={{ fontSize: 16, color: "#666" }}
                            />
                            <Typography variant="caption" color="#666">
                              {post.readTime}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <VisibilityIcon
                              sx={{ fontSize: 16, color: "#666" }}
                            />
                            <Typography variant="caption" color="#666">
                              {post.views}
                            </Typography>
                          </Box>
                        </Box>

                        <Button
                          variant="contained"
                          sx={{
                            backgroundColor: "#1976d2",
                            color: "white",
                            "&:hover": {
                              backgroundColor: "#1565c0",
                            },
                          }}
                        >
                          Đọc tiếp
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Regular Posts */}
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                mb: 4,
              }}
            >
              Bài viết mới nhất
            </Typography>

            <Grid container spacing={4}>
              {regularPosts.map((post) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={post.id}>
                  <Card
                    sx={{
                      height: "100%",
                      transition:
                        "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={post.image}
                      alt={post.title}
                    />
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 2,
                        }}
                      >
                        <Chip
                          icon={post.categoryIcon}
                          label={post.category}
                          size="small"
                          sx={{
                            backgroundColor: `${post.categoryColor}20`,
                            color: post.categoryColor,
                          }}
                        />
                      </Box>

                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: "#1B314B",
                          mb: 2,
                          lineHeight: 1.3,
                        }}
                      >
                        {post.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color: "#1B314B",
                          lineHeight: 1.6,
                          mb: 3,
                        }}
                      >
                        {post.excerpt}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 2,
                        }}
                      >
                        <Avatar
                          src={post.authorAvatar}
                          sx={{ width: 24, height: 24 }}
                        />
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: "#1B314B" }}
                          >
                            {post.author}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="#666"
                            sx={{ display: "block" }}
                          >
                            {post.date}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <CalendarIcon sx={{ fontSize: 14, color: "#666" }} />
                          <Typography variant="caption" color="#666">
                            {post.readTime}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <VisibilityIcon
                            sx={{ fontSize: 14, color: "#666" }}
                          />
                          <Typography variant="caption" color="#666">
                            {post.views}
                          </Typography>
                        </Box>
                      </Box>

                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          borderColor: "#1976d2",
                          color: "#1976d2",
                          "&:hover": {
                            backgroundColor: "#1976d2",
                            color: "white",
                          },
                        }}
                      >
                        Đọc tiếp
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
};

export default BlogPage;
